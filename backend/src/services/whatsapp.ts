/**
 * Serviço de conexão WhatsApp via Baileys
 * Similar ao Portal-Comunidade-Vista-Alegre
 */

import makeWASocket, {
  WASocket,
  DisconnectReason,
  isJidBroadcast,
  isJidStatusBroadcast,
  useMultiFileAuthState,
} from 'baileys';
import NodeCache from 'node-cache';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import QRCode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';

import { badMacHandler } from '../utils/badMacHandler.js';
import {
  infoLog,
  successLog,
  warningLog,
  errorLog,
  sayLog,
  chatLog,
} from '../utils/logger.js';

// Diretórios
const AUTH_DIR = path.resolve(process.cwd(), 'auth_info_baileys');
const TEMP_DIR = path.resolve(process.cwd(), 'temp');

// Garantir diretórios
[AUTH_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Logger Pino silencioso
const logger = pino(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  pino.destination(path.join(TEMP_DIR, 'wa-logs.txt'))
);
logger.level = 'error';

// Versão do WhatsApp Web
const WAWEB_VERSION: [number, number, number] = [2, 3000, 1015901307];

// Cache para retry
const msgRetryCounterCache = new NodeCache();

export interface BotStatus {
  connected: boolean;
  connecting: boolean;
  qrAvailable: boolean;
  pairingCodeAvailable: boolean;
  phoneNumber: string | null;
  lastConnected: string | null;
  uptime: number;
}

type MessageHandler = (phone: string, text: string, msgId: string) => Promise<void>;

/**
 * Classe do serviço WhatsApp
 */
class WhatsAppService {
  private sock: WASocket | null = null;
  private qrCode: string | null = null;
  private pairingCode: string | null = null;
  private connected = false;
  private connecting = false;
  private phoneNumber: string | null = null;
  private lastConnected: Date | null = null;
  private startTime: Date | null = null;
  private messageHandler: MessageHandler | null = null;
  private io: SocketIOServer | null = null;

  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Conectar via QR Code
   */
  async connectWithQR(): Promise<void> {
    if (this.connecting) {
      warningLog('Já conectando...');
      return;
    }

    if (this.connected) {
      warningLog('Já conectado');
      return;
    }

    this.connecting = true;
    this.qrCode = null;
    this.pairingCode = null;

    infoLog('Iniciando conexão via QR Code...');
    await this.createConnection('qr');
  }

  /**
   * Conectar via Pairing Code
   */
  async connectWithPairing(phone: string): Promise<string> {
    if (this.connecting) {
      throw new Error('Já conectando, aguarde...');
    }

    if (this.connected) {
      throw new Error('Já conectado');
    }

    this.connecting = true;
    this.qrCode = null;
    this.pairingCode = null;

    infoLog(`Iniciando conexão via Pairing Code para: ${phone}`);
    await this.createConnection('pairing', phone);

    // Aguardar código de pareamento
    let attempts = 0;
    while (!this.pairingCode && attempts < 30) {
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }

    if (!this.pairingCode) {
      throw new Error('Falha ao gerar código de pareamento');
    }

    return this.pairingCode;
  }

  /**
   * Cria conexão Baileys
   */
  private async createConnection(mode: 'qr' | 'pairing', phone?: string): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const socket = makeWASocket({
      version: WAWEB_VERSION,
      logger,
      defaultQueryTimeoutMs: undefined,
      retryRequestDelayMs: 5000,
      auth: state,
      shouldIgnoreJid: (jid) =>
        isJidBroadcast(jid) || isJidStatusBroadcast(jid),
      connectTimeoutMs: 20_000,
      keepAliveIntervalMs: 30_000,
      maxMsgRetryCount: 5,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      emitOwnEvents: false,
      msgRetryCounterCache,
      shouldSyncHistoryMessage: () => false,
    });

    this.sock = socket;

    // Salvar credenciais
    socket.ev.on('creds.update', saveCreds);

    // Flag para pairing em progresso
    let pairingInProgress = false;

    // Solicitar pairing code
    if (!socket.authState.creds.registered && mode === 'pairing' && phone) {
      pairingInProgress = true;
      infoLog('Aguardando socket ficar pronto (5s)...');
      await new Promise(r => setTimeout(r, 5000));

      try {
        const cleanPhone = phone.replace(/\D/g, '');
        const code = await socket.requestPairingCode(cleanPhone);
        this.pairingCode = code;
        sayLog(`Código de pareamento: ${code}`);
        this.emitStatus();
      } catch (err: any) {
        errorLog('Falha ao gerar código:', err);
        pairingInProgress = false;
        this.connecting = false;
        throw err;
      }
    }

    // Handler de conexão
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Code
      if (qr && mode === 'qr') {
        infoLog('QR Code gerado');
        try {
          this.qrCode = await QRCode.toDataURL(qr);
          this.emitStatus();
        } catch (err) {
          errorLog('Erro ao gerar QR');
        }
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as any;
        const statusCode = error?.output?.statusCode;

        // Ignorar closes durante pairing
        if (pairingInProgress) {
          if ([428, 401, undefined].includes(statusCode)) {
            infoLog('Pareamento em progresso, aguardando...');
            return;
          }
        }

        this.connected = false;
        this.connecting = false;
        pairingInProgress = false;
        this.emitStatus();

        // Bad MAC
        if (badMacHandler.handleError(error, 'connection')) {
          if (badMacHandler.hasReachedLimit()) {
            badMacHandler.clearProblematicSessionFiles();
            badMacHandler.resetErrorCount();
          }
        }

        if (statusCode === DisconnectReason.loggedOut) {
          errorLog('Bot deslogado!');
          this.qrCode = null;
          this.pairingCode = null;
          badMacHandler.clearAllSessionFiles();
        } else {
          warningLog(`Desconectado (${statusCode}). Reconectando...`);
          await this.createConnection(mode, phone);
        }
      } else if (connection === 'open') {
        successLog('Conectado ao WhatsApp!');
        this.connected = true;
        this.connecting = false;
        pairingInProgress = false;
        this.qrCode = null;
        this.pairingCode = null;
        this.lastConnected = new Date();
        this.startTime = new Date();
        this.phoneNumber = socket.user?.id?.split(':')[0] || null;
        badMacHandler.resetErrorCount();
        infoLog(`Número: ${this.phoneNumber}`);
        this.emitStatus();
      } else {
        infoLog('Atualizando conexão...');
      }
    });

    // Handler de mensagens
    socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (msg.key && !msg.key.fromMe && msg.message) {
          const phone = msg.key.remoteJid?.split('@')[0] || '';
          const text = this.extractText(msg);
          const msgId = msg.key.id || '';

          if (phone && text) {
            chatLog(phone, text);
            if (this.messageHandler) {
              try {
                await this.messageHandler(phone, text, msgId);
              } catch (err: any) {
                errorLog('Erro ao processar mensagem:', err);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Extrai texto da mensagem
   */
  private extractText(msg: any): string {
    const m = msg.message;
    if (!m) return '';

    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId;
    if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;

    return '';
  }

  /**
   * Envia mensagem
   */
  async sendMessage(phone: string, text: string): Promise<void> {
    if (!this.sock || !this.connected) {
      throw new Error('Bot não conectado');
    }

    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
  }

  /**
   * Desconectar
   */
  async disconnect(): Promise<void> {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (e) {
        // Ignora
      }
      this.sock = null;
    }

    this.connected = false;
    this.connecting = false;
    this.qrCode = null;
    this.pairingCode = null;
    this.phoneNumber = null;
    this.startTime = null;

    successLog('Bot desconectado');
    this.emitStatus();
  }

  /**
   * Limpar sessão
   */
  async clearSession(): Promise<void> {
    await this.disconnect();
    await new Promise(r => setTimeout(r, 1000));
    badMacHandler.clearAllSessionFiles();
    successLog('Sessão limpa');
    this.emitStatus();
  }

  /**
   * Emite status via Socket.IO
   */
  private emitStatus(): void {
    if (this.io) {
      this.io.emit('bot:status', this.getStatus());
      if (this.qrCode) {
        this.io.emit('bot:qr', this.qrCode);
      }
      if (this.pairingCode) {
        this.io.emit('bot:pairing', this.pairingCode);
      }
    }
  }

  // Getters
  getStatus(): BotStatus {
    return {
      connected: this.connected,
      connecting: this.connecting,
      qrAvailable: !!this.qrCode,
      pairingCodeAvailable: !!this.pairingCode,
      phoneNumber: this.phoneNumber,
      lastConnected: this.lastConnected?.toISOString() || null,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
    };
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  getPairingCode(): string | null {
    return this.pairingCode;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
