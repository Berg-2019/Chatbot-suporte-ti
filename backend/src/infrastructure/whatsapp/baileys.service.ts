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
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
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
        const mediaInfo = this.detectMedia(msg);

        // Sem texto E sem mídia → ignora
        if (!text && !mediaInfo) continue;

        const phone = from.split('@')[0];
        this.logger.debug(`📩 ${phone}: ${text?.substring(0, 80) ?? '[mídia]'}`);

        // RC#3: baixar e persistir mídia em disco, se houver
        let savedMedia: { mediaUrl: string; fileName: string } | null = null;
        if (mediaInfo) {
          savedMedia = await this.downloadAndSaveMedia(msg, mediaInfo);
          if (!savedMedia) {
            this.logger.warn(`Mídia detectada (${mediaInfo.type}) mas falhou ao salvar — descartando`);
            // Continua: se houver texto (legenda), ainda assim processamos
          }
        }

        if (this.onMessageCallback) {
          try {
            const mediaParam = savedMedia
              ? { type: mediaInfo!.type, mediaUrl: savedMedia.mediaUrl, fileName: savedMedia.fileName }
              : undefined;
            await this.onMessageCallback(from, text || '', msg, mediaParam);
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

  /**
   * Detecta o tipo de mídia em uma mensagem entrante (RC#3).
   * Retorna UPPERCASE para casar com MessageType do Prisma.
   */
  private detectMedia(
    msg: proto.IWebMessageInfo,
  ): { type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'; mime?: string; fileName?: string } | null {
    const m = msg.message;
    if (!m) return null;
    if (m.imageMessage) {
      return { type: 'IMAGE', mime: m.imageMessage.mimetype || 'image/jpeg' };
    }
    if (m.audioMessage) {
      return { type: 'AUDIO', mime: m.audioMessage.mimetype || 'audio/ogg; codecs=opus' };
    }
    if (m.videoMessage) {
      return { type: 'VIDEO', mime: m.videoMessage.mimetype || 'video/mp4' };
    }
    if (m.documentMessage) {
      return {
        type: 'DOCUMENT',
        mime: m.documentMessage.mimetype || 'application/octet-stream',
        fileName: m.documentMessage.fileName || undefined,
      };
    }
    return null;
  }

  /**
   * Extrai extensão de arquivo a partir de um mimetype.
   */
  private extMime(mime?: string): string {
    if (!mime) return 'bin';
    if (mime.includes('jpeg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('mpeg')) return 'mp3';
    return (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '') || 'bin';
  }

  /**
   * Baixa mídia do WhatsApp via Baileys e salva em uploads/messages/.
   * Retorna { mediaUrl, fileName } relativo para servir via estático.
   */
  private async downloadAndSaveMedia(
    msg: proto.IWebMessageInfo,
    media: { type: string; mime?: string; fileName?: string },
  ): Promise<{ mediaUrl: string; fileName: string } | null> {
    try {
      if (!this.sock) return null;

      // Cast necessário: IWebMessageInfo é structuralmente compatível com WAMessage,
      // mas os tipos do Baileys não são idênticos (Key é nullable de um lado).
      const buffer = (await downloadMediaMessage(
        msg as any,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: this.sock.updateMediaMessage,
        },
      )) as Buffer;

      if (!buffer || buffer.length === 0) {
        this.logger.warn('downloadMediaMessage retornou buffer vazio');
        return null;
      }

      const dir = path.join(process.cwd(), 'uploads', 'messages');
      fs.mkdirSync(dir, { recursive: true });

      const fileName = media.fileName || `${randomUUID()}.${this.extMime(media.mime)}`;
      fs.writeFileSync(path.join(dir, fileName), buffer);

      this.logger.debug(`Mídia salva: ${fileName} (${buffer.length} bytes)`);
      return { mediaUrl: `/uploads/messages/${fileName}`, fileName };
    } catch (err: any) {
      this.logger.error(`Falha ao baixar mídia: ${err.message}`);
      return null;
    }
  }

  /**
   * Transcodifica um áudio (ex.: webm/opus do navegador) para ogg/opus,
   * formato aceito pelo WhatsApp como nota de voz. Requer ffmpeg no PATH.
   * Retorna null em falha (o chamador faz fallback para o buffer original).
   */
  private transcodeToOpusOgg(inputPath: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      try {
        const ff = spawn('ffmpeg', [
          '-i', inputPath,
          '-vn',
          '-c:a', 'libopus',
          '-b:a', '32k',
          '-ar', '48000',
          '-ac', '1',
          '-f', 'ogg',
          'pipe:1',
        ]);
        const chunks: Buffer[] = [];
        let stderr = '';
        ff.stdout.on('data', (d: Buffer) => chunks.push(d));
        ff.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
        ff.on('error', (e) => {
          this.logger.warn(`ffmpeg indisponível: ${e.message}`);
          resolve(null);
        });
        ff.on('close', (code) => {
          if (code === 0 && chunks.length > 0) {
            resolve(Buffer.concat(chunks));
          } else {
            this.logger.warn(`ffmpeg falhou (code ${code}): ${stderr.slice(-200)}`);
            resolve(null);
          }
        });
      } catch (e: any) {
        this.logger.warn(`Erro ao transcodificar áudio: ${e.message}`);
        resolve(null);
      }
    });
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
              let buffer: Buffer = fs.readFileSync(filePath);
              // Áudio: WhatsApp espera ogg/opus (nota de voz). O navegador grava
              // webm/opus → transcodificar via ffmpeg. Se falhar, envia o original.
              if (mediaType === 'audio' && !fileNameOnDisk.toLowerCase().endsWith('.ogg')) {
                const ogg = await this.transcodeToOpusOgg(filePath);
                if (ogg) buffer = ogg;
              }
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
