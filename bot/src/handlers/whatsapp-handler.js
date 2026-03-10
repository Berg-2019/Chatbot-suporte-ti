/**
 * WhatsApp Handler - Conexão e gerenciamento com Baileys
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import axios from 'axios';
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
    this.currentQR = null;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected
  }

  async connect() {
    this.connectionState = 'connecting';
    this.currentQR = null;

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
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
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
      this.currentQR = qr;
      this.connectionState = 'waiting_qr';
      console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n');
      console.log('📱 QR também disponível em: http://localhost:3002/api/qr');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Conexão fechada. Status: ${statusCode}`);
      this.isConnected = false;

      await this.updateStatus();

      // Se for 401 ou LoggedOut, limpar sessão e reconectar
      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.log('❌ Sessão inválida ou desconectada pelo WhatsApp.');
        console.log('🗑️ Limpando sessão e reiniciando...');

        const sessionPath = path.join(config.bot.sessionPath, config.bot.sessionName);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }

        this.sock = null;
        setTimeout(() => this.connect(), 1000);
      } else if (shouldReconnect) {
        console.log('🔄 Reconectando em 3s...');
        setTimeout(() => this.connect(), 3000);
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

      // === COMANDOS DO SISTEMA ===
      // !tecnico [nome/email] -> Vincula o WhatsApp atual ao usuário do sistema
      if (text?.toLowerCase().startsWith('!tecnico ')) {
        const username = text.substring(9).trim();
        if (!username) {
          await this.sendMessage(from, '❌ Digite o nome do usuário. Ex: !tecnico matheus');
          continue;
        }

        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          const res = await axios.post(`${backendUrl}/api/bot/users/link`, {
            identifier: username,
            waId: from // Salva o JID completo para envio de mensagens
          });

          const user = res.data.user;
          await this.sendMessage(from, `✅ *Sucesso!* \nSeu WhatsApp foi vinculado ao usuário:\nNome: *${user.name}*\nEmail: ${user.email}\nFunção: ${user.role}`);
          console.log(`🔗 Técnico vinculado via comando: ${phone} -> ${user.name}`);

        } catch (error) {
          const errorMsg = error.response?.data?.message || error.message;
          await this.sendMessage(from, `❌ Falha ao vincular usuário: ${errorMsg}`);
        }
        continue; // Não processa como fluxo de atendimento
      }

      // Processar com o flow handler
      const hasMedia = msg.message?.imageMessage ||
        msg.message?.audioMessage ||
        msg.message?.videoMessage ||
        msg.message?.documentMessage;

      if (text || hasMedia) {
        try {
          await flowHandler.handleMessage(this.sock, from, text || '', msg);
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
      console.log(`📨 Baileys sendMessage para: ${to}`);
      const result = await this.sock.sendMessage(to, { text });
      console.log(`📨 Baileys resultado:`, result?.key?.id || 'sem ID');
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
      console.error('❌ Stack:', error.stack);
      return false;
    }
  }

  async updateStatus() {
    await redisService.updateBotStatus({
      connected: this.isConnected,
      phoneNumber: this.phoneNumber,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      lastConnected: this.isConnected ? new Date().toISOString() : null,
      connectionState: this.connectionState,
    });
  }

  // === Métodos para API ===

  getStatus() {
    return {
      connected: this.isConnected,
      phoneNumber: this.phoneNumber,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      connectionState: this.connectionState,
      hasQR: !!this.currentQR,
    };
  }

  getCurrentQR() {
    return this.currentQR;
  }

  async requestPairingCode(phoneNumber) {
    if (!this.sock) {
      throw new Error('Socket não inicializado');
    }

    if (this.isConnected) {
      throw new Error('Já está conectado');
    }

    try {
      console.log(`📱 Solicitando código de pareamento para: ${phoneNumber}`);
      const code = await this.sock.requestPairingCode(phoneNumber);
      console.log(`✅ Código de pareamento gerado: ${code}`);
      return code;
    } catch (error) {
      console.error('❌ Erro ao gerar pairing code:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.sock) {
      this.sock.end();
      this.isConnected = false;
      this.connectionState = 'disconnected';
      this.currentQR = null;
      await this.updateStatus();
    }
  }

  async restart() {
    console.log('🔄 Reiniciando conexão...');
    await this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  async getProfilePicture(jid) {
    if (!this.sock || !this.isConnected) {
      console.error('❌ WhatsApp não conectado');
      return null;
    }

    try {
      console.log(`📸 Buscando foto de perfil para: ${jid}`);

      // Baileys method to get profile picture URL
      const profilePicUrl = await this.sock.profilePictureUrl(jid, 'image');

      console.log(`✅ Foto de perfil encontrada: ${profilePicUrl ? 'sim' : 'não'}`);
      return profilePicUrl || null;
    } catch (error) {
      // Error 404 means no profile picture set
      if (error.output?.statusCode === 404 || error.message?.includes('404')) {
        console.log(`ℹ️ Contato ${jid} não possui foto de perfil`);
        return null;
      }

      console.error('❌ Erro ao buscar foto de perfil:', error.message);
      return null;
    }
  }

  async logout() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        console.log('Logout forçado');
      }
      this.sock.end();
      this.isConnected = false;
      this.connectionState = 'disconnected';
      this.currentQR = null;

      // Limpar sessão
      const sessionPath = path.join(config.bot.sessionPath, config.bot.sessionName);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('🗑️ Sessão removida');
      }

      await this.updateStatus();
    }
  }
}

export const whatsappHandler = new WhatsAppHandler();
