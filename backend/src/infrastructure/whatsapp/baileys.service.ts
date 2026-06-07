import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { WhatsAppStatus } from './whatsapp.types';
import { SESSION_DIR, RECONNECT_DELAY, STATUS_KEY } from './whatsapp.constants';
import { RedisService } from '../cache/redis.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BaileysService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaileysService.name);
  private sock: WASocket | null = null;
  private isConnected = false;
  private phoneNumber: string | null = null;
  private startTime: number | null = null;
  private currentQr: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private enabled: boolean;

  /**
   * Mídia de entrada (RC#3): quando a mensagem recebida contém imagem/áudio/vídeo/doc,
   * o BaileysService baixa e emite este payload ao callback junto com text (legenda).
   */
  private onMessageCallback:
    | ((
        from: string,
        text: string,
        msg: proto.IWebMessageInfo,
        media?: { type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'; mediaUrl: string; fileName: string },
      ) => Promise<void>)
    | null = null;

  constructor(
    private config: ConfigService,
    private redis: RedisService,
    private rabbitmq: RabbitMQService,
    private prisma: PrismaService,
  ) {
    this.enabled = this.config.get('WHATSAPP_BOT_ENABLED', 'true') === 'true';
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('WhatsApp bot desabilitado (WHATSAPP_BOT_ENABLED=false)');
      return;
    }
    await this.connect();
    await this.consumeOutgoingMessages();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  onMessage(
    callback: (
      from: string,
      text: string,
      msg: proto.IWebMessageInfo,
      media?: { type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'; mediaUrl: string; fileName: string },
    ) => Promise<void>,
  ) {
    this.onMessageCallback = callback;
  }

  async connect(): Promise<void> {
    const sessionPath = path.resolve(SESSION_DIR);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(sessionPath, 'helpdesk-bot'),
    );

    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'silent' });

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: ['MSM Helpdesk', 'Chrome', '120.0.0'],
      getMessage: async () => undefined,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.currentQr = await QRCode.toDataURL(qr);
        this.logger.log('📱 QR Code gerado — escaneie via /api/whatsapp/qr ou /dev');
      }

      if (connection === 'close') {
        this.isConnected = false;
        this.currentQr = null;
        await this.updateStatus();

        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.logger.warn(`Conexão fechada (status: ${statusCode})`);

        if (shouldReconnect) {
          this.logger.log(`Reconectando em ${RECONNECT_DELAY / 1000}s...`);
          this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
        } else {
          this.logger.error('Deslogado do WhatsApp. Limpe a sessão e reconecte.');
        }
      }

      if (connection === 'open') {
        this.isConnected = true;
        this.startTime = Date.now();
        this.currentQr = null;
        this.phoneNumber = this.sock?.user?.id?.split(':')[0] || null;
        this.logger.log(`✅ WhatsApp conectado (${this.phoneNumber})`);
        await this.updateStatus();
      }
    });

    this.sock.ev.on('messages.upsert', async (upsert) => {
      if (upsert.type !== 'notify') return;

      for (const msg of upsert.messages) {
        if (msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        if (!from || from.endsWith('@g.us')) continue;

        const text = this.extractText(msg);
        if (!text) continue;

        const phone = from.split('@')[0];
        this.logger.debug(`📩 ${phone}: ${text.substring(0, 80)}`);

        if (this.onMessageCallback) {
          try {
            await this.onMessageCallback(from, text, msg);
          } catch (err: any) {
            this.logger.error(`Erro ao processar mensagem: ${err.message}`);
          }
        }
      }
    });
  }

  private extractText(msg: proto.IWebMessageInfo): string | null {
    const m = msg.message;
    if (!m) return null;
    return (
      m.conversation ||
      m.extendedTextMessage?.text ||
      m.imageMessage?.caption ||
      m.videoMessage?.caption ||
      m.documentMessage?.caption ||
      null
    );
  }

  async sendText(jid: string, text: string): Promise<string | null> {
    if (!this.sock || !this.isConnected) {
      this.logger.error('WhatsApp não conectado — mensagem não enviada');
      return null;
    }
    try {
      const result = await this.sock.sendMessage(jid, { text });
      return result?.key?.id || null;
    } catch (err: any) {
      this.logger.error(`Erro ao enviar mensagem: ${err.message}`);
      return null;
    }
  }

  async sendMedia(
    jid: string,
    buffer: Buffer,
    type: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    fileName?: string,
  ): Promise<string | null> {
    if (!this.sock || !this.isConnected) return null;
    try {
      const msgContent: any = {};
      if (type === 'image') {
        msgContent.image = buffer;
        if (caption) msgContent.caption = caption;
      } else if (type === 'video') {
        msgContent.video = buffer;
        if (caption) msgContent.caption = caption;
      } else if (type === 'audio') {
        msgContent.audio = buffer;
        msgContent.mimetype = 'audio/ogg; codecs=opus';
        msgContent.ptt = true;
      } else {
        msgContent.document = buffer;
        msgContent.fileName = fileName || 'document';
        if (caption) msgContent.caption = caption;
      }
      const result = await this.sock.sendMessage(jid, msgContent);
      return result?.key?.id || null;
    } catch (err: any) {
      this.logger.error(`Erro ao enviar mídia: ${err.message}`);
      return null;
    }
  }

  private async consumeOutgoingMessages() {
    try {
      await this.rabbitmq.consume(
        RabbitMQService.QUEUES.OUTGOING_MESSAGES,
        async (data: any) => {
          const { to, text, content, messageId, mediaUrl, mediaType, filename } = data;
          if (!to) return;

          const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
          const caption = (text || content || '') as string;

          let waId: string | null = null;

          if (mediaUrl && mediaType) {
            // RC#2: envio de mídia (imagem/áudio/vídeo/documento)
            try {
              // mediaUrl chega como "/uploads/messages/<arquivo>"
              const urlStr = String(mediaUrl);
              const fileNameOnDisk = decodeURIComponent(urlStr.split('/').pop() || '');
              if (!fileNameOnDisk) {
                this.logger.warn(`mediaUrl inválido (sem nome de arquivo): ${urlStr}`);
                return;
              }
              const filePath = path.join(process.cwd(), 'uploads', 'messages', fileNameOnDisk);
              if (!fs.existsSync(filePath)) {
                this.logger.warn(`Mídia não encontrada em disco: ${filePath}`);
                return;
              }
              const buffer = fs.readFileSync(filePath);
              waId = await this.sendMedia(
                jid,
                buffer,
                mediaType,
                caption || undefined,
                filename || fileNameOnDisk,
              );
            } catch (err: any) {
              this.logger.error(`Erro ao enviar mídia outgoing: ${err.message}`);
              return;
            }
          } else {
            if (!caption) return; // texto vazio e sem mídia → nada a enviar
            waId = await this.sendText(jid, caption);
          }

          if (waId && messageId) {
            try {
              await this.prisma.message.update({
                where: { id: messageId },
                data: { waMessageId: waId },
              });
              this.logger.debug(`Outgoing enviado: ${waId} (msg: ${messageId})`);
            } catch { /* message may not exist */ }
          }
        },
      );
      this.logger.log('📥 Consumindo fila outgoing_messages');
    } catch (err: any) {
      this.logger.warn(`Falha ao consumir outgoing_messages: ${err.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
    this.isConnected = false;
    await this.updateStatus();
  }

  async restart(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  getStatus(): WhatsAppStatus {
    return {
      connected: this.isConnected,
      phoneNumber: this.phoneNumber,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      lastConnected: this.startTime ? new Date(this.startTime).toISOString() : null,
      qrCode: this.currentQr,
    };
  }

  getQrCode(): string | null {
    return this.currentQr;
  }

  private async updateStatus() {
    try {
      await this.redis.set(
        STATUS_KEY,
        JSON.stringify({
          connected: this.isConnected,
          phoneNumber: this.phoneNumber,
          uptime: this.startTime ? Date.now() - this.startTime : 0,
          lastConnected: this.startTime ? new Date(this.startTime).toISOString() : null,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch { /* Redis failure is non-critical */ }
  }
}
