/**
 * WhatsApp Handler - Conexão e gerenciamento com Baileys
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { redisService } from '../services/redis.js';
import { flowHandler } from './flow-handler.js';

class WhatsAppHandler {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.phoneNumber = null;
    this.startTime = null;
  }

  async connect() {
    // Garantir que diretório de sessão existe
    const sessionPath = config.bot.sessionPath;
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Auth state
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(sessionPath, config.bot.sessionName)
    );

    // Versão do WhatsApp
    const { version } = await fetchLatestBaileysVersion();

    // Logger silencioso
    const logger = pino({ level: 'silent' });

    // Criar socket
    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: ['Helpdesk Bot', 'Chrome', '120.0.0'],
      getMessage: async () => undefined,
    });

    // Salvar credenciais
    this.sock.ev.on('creds.update', saveCreds);

    // Atualização de conexão
    this.sock.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(update);
    });

    // Mensagens recebidas
    this.sock.ev.on('messages.upsert', async (upsert) => {
      await this.handleMessagesUpsert(upsert);
    });

    return this.sock;
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Conexão fechada. Status: ${statusCode}`);
      this.isConnected = false;

      await this.updateStatus();

      if (shouldReconnect) {
        console.log('🔄 Reconectando em 3s...');
        setTimeout(() => this.connect(), 3000);
      } else {
        console.log('❌ Deslogado. Limpe a sessão e reconecte.');
      }
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp conectado!');
      this.isConnected = true;
      this.startTime = Date.now();
      this.phoneNumber = this.sock.user?.id?.split(':')[0] || null;

      await this.updateStatus();
    }
  }

  async handleMessagesUpsert(upsert) {
    const messages = upsert.messages;

    for (const msg of messages) {
      // Ignorar mensagens próprias e notificações
      if (msg.key.fromMe) continue;
      if (upsert.type !== 'notify') continue;

      // Extrair informações
      const from = msg.key.remoteJid;
      const text = this.extractMessageText(msg);

      // Ignorar grupos (opcional)
      if (from.endsWith('@g.us')) continue;

      // Log
      const phone = from.split('@')[0];
      console.log(`📩 Mensagem de ${phone}: ${text?.substring(0, 50) || '[mídia]'}`);

      // Processar com o flow handler
      if (text) {
        try {
          await flowHandler.handleMessage(this.sock, from, text, msg);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error.message);
          await this.sendMessage(from, config.messages.error);
        }
      }
    }
  }

  extractMessageText(msg) {
    const message = msg.message;
    if (!message) return null;

    return (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      message.documentMessage?.caption ||
      null
    );
  }

  async sendMessage(to, text) {
    if (!this.sock || !this.isConnected) {
      console.error('❌ WhatsApp não conectado');
      return false;
    }

    try {
      await this.sock.sendMessage(to, { text });
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      return false;
    }
  }

  async updateStatus() {
    await redisService.updateBotStatus({
      connected: this.isConnected,
      phoneNumber: this.phoneNumber,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      lastConnected: this.isConnected ? new Date().toISOString() : null,
    });
  }

  async disconnect() {
    if (this.sock) {
      this.sock.end();
      this.isConnected = false;
      await this.updateStatus();
    }
  }
}

export const whatsappHandler = new WhatsAppHandler();
