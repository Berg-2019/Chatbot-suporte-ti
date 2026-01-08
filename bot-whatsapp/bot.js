const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Importar módulos do bot
const config = require('./config/config');
const database = require('./db/database');
const commandHandler = require('./handlers/commands');
const { botLogger } = require('./utils/logger');
const backupManager = require('./utils/backup');
const { ensureOllamaRunning } = require('./utils/ollama-fix');
const { sendAdminNotification, emailTemplates } = require('./config/email');

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 segundos
    
    // Criar diretórios necessários
    this.ensureDirectories();
    
    // Inicializar limpeza automática
    this.setupCleanupSchedule();
    
    // Inicializar sistema de backup
    this.initializeBackupSystem();
  }

  ensureDirectories() {
    const dirs = [
      './logs',
      './db',
      config.whatsapp.sessionPath
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async start() {
    try {
      botLogger.connection('STARTING', 'Iniciando bot WhatsApp...');
      console.log('🤖 Iniciando Bot de Atendimento WhatsApp...');
      
      await this.connectToWhatsApp();
    } catch (error) {
      botLogger.botError(error, 'START');
      console.error('❌ Erro ao iniciar bot:', error);
      process.exit(1);
    }
  }

  async connectToWhatsApp() {
    try {
      // Obter versão mais recente do Baileys
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WhatsApp v${version.join('.')}, é a mais recente: ${isLatest}`);

      // Configurar autenticação
      const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionPath);

      // Criar socket WhatsApp
      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // Vamos usar nossa própria implementação
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
          return { conversation: 'Mensagem não encontrada' };
        }
      });

      // Event listeners
      this.setupEventListeners(saveCreds);

    } catch (error) {
      botLogger.botError(error, 'CONNECT');
      throw error;
    }
  }

  setupEventListeners(saveCreds) {
    // Salvar credenciais quando atualizadas
    this.sock.ev.on('creds.update', saveCreds);

    // Monitorar conexão
    this.sock.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update);
    });

    // Processar mensagens recebidas
    this.sock.ev.on('messages.upsert', async (messageUpdate) => {
      await this.handleIncomingMessages(messageUpdate);
    });

    // Monitorar presença
    this.sock.ev.on('presence.update', (presence) => {
      botLogger.userAction(presence.id, 'PRESENCE_UPDATE', presence.presences ? Object.keys(presence.presences).join(',') : '');
    });

    // Monitorar grupos
    this.sock.ev.on('groups.upsert', (groups) => {
      groups.forEach(group => {
        botLogger.userAction(group.id, 'GROUP_JOINED', group.subject);
      });
    });
  }

  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 QR Code gerado! Escaneie com seu WhatsApp:');
      qrcode.generate(qr, { small: true });
      botLogger.qrCode();
    }

    if (connection === 'close') {
      this.isConnected = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      botLogger.connection('CLOSED', `Reason: ${lastDisconnect?.error?.output?.statusCode}`);
      console.log('❌ Conexão fechada:', lastDisconnect?.error);

      if (shouldReconnect) {
        this.handleReconnection();
      } else {
        console.log('🚪 Deslogado do WhatsApp. Execute novamente para reconectar.');
        process.exit(0);
      }
    } else if (connection === 'open') {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      botLogger.connection('OPEN', 'Bot conectado com sucesso');
      console.log('✅ Bot conectado ao WhatsApp com sucesso!');
      console.log(`📞 Número do bot: ${config.whatsapp.botNumber}`);
      console.log(`👑 Números root: ${config.whatsapp.rootNumbers.join(', ')}`);
      console.log('🎯 Bot pronto para receber mensagens!');
      
      // Enviar mensagem de inicialização para números root
      this.notifyRootUsers('🤖 Bot de Atendimento iniciado com sucesso!');
    } else if (connection === 'connecting') {
      botLogger.connection('CONNECTING', 'Conectando ao WhatsApp...');
      console.log('🔄 Conectando ao WhatsApp...');
    }
  }

  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      botLogger.connection('MAX_RECONNECT_REACHED', `Tentativas: ${this.reconnectAttempts}`);
      console.log('❌ Máximo de tentativas de reconexão atingido. Encerrando...');
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    botLogger.connection('RECONNECTING', `Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
    console.log(`🔄 Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${delay/1000}s...`);
    
    setTimeout(() => {
      this.connectToWhatsApp();
    }, delay);
  }

  async handleIncomingMessages(messageUpdate) {
    try {
      const messages = messageUpdate.messages;
      
      for (const message of messages) {
        // Ignorar mensagens próprias e de status
        if (message.key.fromMe || message.key.remoteJid === 'status@broadcast') {
          continue;
        }

        // Extrair informações da mensagem
        const messageInfo = this.extractMessageInfo(message);
        if (!messageInfo) continue;

        const { from, text, isGroup, senderPhone } = messageInfo;

        // Log da mensagem recebida
        botLogger.messageReceived(from, text);

        // Marcar como lida
        await this.sock.readMessages([message.key]);

        // Verificar se é o grupo técnico (buscar do banco de dados)
        const grupoTecnicoId = await database.obterGrupoTecnico();
        const isGrupoTecnico = from === grupoTecnicoId;
        
        // Verificar se é um grupo regular (não o grupo técnico)
        const isGrupoRegular = isGroup && !isGrupoTecnico;
        
        // Processar respostas automáticas para grupos regulares
        if (isGrupoRegular) {
          // Verificar palavras-chave para resposta automática
          if (text.toLowerCase().includes('oi bot')) {
            // Extrair nome do remetente se disponível
            let senderName = senderPhone;
            if (message.pushName) {
              senderName = message.pushName;
            }
            
            const responseText = `Olá ${senderName}, sou o bot do grupo!`;
            try {
              await this.sock.sendMessage(from, { text: responseText });
              botLogger.messageSent(from, responseText);
            } catch (error) {
              botLogger.botError(error, 'SEND_MESSAGE');
            }
            continue; // Não processar outros handlers para esta mensagem
          }
          
          if (text.trim() === '!ajuda') {
            const responseText = 'Aqui está a lista de comandos disponíveis...';
            try {
              await this.sock.sendMessage(from, { text: responseText });
              botLogger.messageSent(from, responseText);
            } catch (error) {
              botLogger.botError(error, 'SEND_MESSAGE');
            }
            continue; // Não processar outros handlers para esta mensagem
          }
        }
        
        // Processar mensagens do grupo técnico ou mensagens privadas
        if (!isGroup || isGrupoTecnico || text.includes(`@${config.whatsapp.botNumber}`) || text.startsWith('!') || text.toLowerCase().startsWith('chamado')) {
          // Função para enviar resposta
          const sendMessage = async (responseText) => {
            try {
              await this.sock.sendMessage(from, { text: responseText });
              botLogger.messageSent(from, responseText);
            } catch (error) {
              botLogger.botError(error, 'SEND_MESSAGE');
            }
          };

          // Processar comando/mensagem
          await commandHandler.handleMessage(
            { body: text },
            sendMessage,
            senderPhone,
            isGrupoTecnico
          );
        }
      }
    } catch (error) {
      botLogger.botError(error, 'HANDLE_MESSAGES');
    }
  }

  extractMessageInfo(message) {
    try {
      const from = message.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      
      // Extrair número do remetente
      let senderPhone;
      if (isGroup) {
        senderPhone = message.key.participant?.replace('@s.whatsapp.net', '') || '';
      } else {
        senderPhone = from.replace('@s.whatsapp.net', '');
      }

      // Extrair texto da mensagem
      let text = '';
      if (message.message?.conversation) {
        text = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        text = message.message.extendedTextMessage.text;
      } else if (message.message?.imageMessage?.caption) {
        text = message.message.imageMessage.caption;
      } else if (message.message?.videoMessage?.caption) {
        text = message.message.videoMessage.caption;
      }

      if (!text || !senderPhone) {
        return null;
      }

      return {
        from,
        text: text.trim(),
        isGroup,
        senderPhone
      };
    } catch (error) {
      botLogger.botError(error, 'EXTRACT_MESSAGE_INFO');
      return null;
    }
  }

  async notifyRootUsers(message) {
    // Enviar mensagem primeiro para o root principal (primeiro da lista)
    const rootNumbers = config.whatsapp.rootNumbers;
    
    if (rootNumbers.length === 0) {
      botLogger.systemInfo('Nenhum número root configurado');
      return;
    }
    
    // Tentar enviar para o root principal primeiro
    const primaryRoot = rootNumbers[0];
    const primaryJid = `${primaryRoot}@s.whatsapp.net`;
    
    try {
      await this.sock.sendMessage(primaryJid, { text: message });
      botLogger.messageSent(primaryJid, message);
      console.log(`✅ Mensagem de inicialização enviada para root principal: ${primaryRoot}`);
    } catch (error) {
      botLogger.botError(error, `NOTIFY_ROOT_PRIMARY_${primaryRoot}`);
      console.log(`❌ Falha ao enviar mensagem para root principal: ${primaryRoot}`);
      
      // Enviar notificação por e-mail sobre falha no envio WhatsApp
      if (config.email.adminEmails.length > 0) {
        const emailSubject = 'Falha na Notificação do Bot WhatsApp';
        const emailText = `Falha ao enviar mensagem de inicialização para o root principal (${primaryRoot}). 
Tentando enviar para roots secundários.
        
Mensagem: ${message}
        
Data: ${new Date().toLocaleString('pt-BR')}`;
        
        await sendAdminNotification(emailSubject, emailText);
      }
      
      // Se falhar, tentar enviar para os roots secundários
      if (rootNumbers.length > 1) {
        console.log('🔄 Tentando enviar mensagem para roots secundários...');
        
        for (let i = 1; i < rootNumbers.length; i++) {
          const secondaryRoot = rootNumbers[i];
          const secondaryJid = `${secondaryRoot}@s.whatsapp.net`;
          
          try {
            await this.sock.sendMessage(secondaryJid, { text: message });
            botLogger.messageSent(secondaryJid, message);
            console.log(`✅ Mensagem de inicialização enviada para root secundário: ${secondaryRoot}`);
            break; // Parar após o primeiro envio bem-sucedido
          } catch (secondaryError) {
            botLogger.botError(secondaryError, `NOTIFY_ROOT_SECONDARY_${secondaryRoot}`);
            console.log(`❌ Falha ao enviar mensagem para root secundário: ${secondaryRoot}`);
            
            // Se for o último root e todas as tentativas falharam
            if (i === rootNumbers.length - 1) {
              console.log('❌ Falha ao enviar mensagem para todos os roots configurados');
              
              // Enviar notificação por e-mail sobre falha total
              if (config.email.adminEmails.length > 0) {
                const emailSubject = 'Falha Total na Notificação do Bot WhatsApp';
                const emailText = `Falha ao enviar mensagem de inicialização para todos os roots configurados.
                
Mensagem: ${message}
Roots: ${rootNumbers.join(', ')}
                
Data: ${new Date().toLocaleString('pt-BR')}`;
                
                await sendAdminNotification(emailSubject, emailText);
              }
            }
          }
        }
      } else {
        console.log('❌ Não há roots secundários configurados para fallback');
      }
    }
  }

  setupCleanupSchedule() {
    // Executar limpeza automática a cada 24 horas
    setInterval(async () => {
      try {
        const deletedCount = await database.limparHistoricoAntigo();
        if (deletedCount > 0) {
          botLogger.cleanup(deletedCount);
          console.log(`🧹 Limpeza automática: ${deletedCount} registros antigos removidos`);
        }
      } catch (error) {
        botLogger.botError(error, 'AUTO_CLEANUP');
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }

  initializeBackupSystem() {
    console.log('🔧 Inicializando sistema de backup...');
    
    // O BackupManager já se inicializa automaticamente
    // Apenas registrar que foi inicializado
    botLogger.systemInfo({
      memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
      uptime: Math.floor(process.uptime() / 3600),
      dbSize: 'N/A'
    });
  }

  async stop() {
    try {
      botLogger.connection('STOPPING', 'Parando bot...');
      console.log('🛑 Parando bot...');
      
      if (this.sock) {
        await this.sock.logout();
      }
      
      await database.close();
      
      console.log('✅ Bot parado com sucesso');
      process.exit(0);
    } catch (error) {
      botLogger.botError(error, 'STOP');
      process.exit(1);
    }
  }

  // Método para enviar mensagem programaticamente
  async sendMessage(to, message) {
    try {
      if (!this.isConnected) {
        throw new Error('Bot não está conectado');
      }

      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text: message });
      botLogger.messageSent(jid, message);
      return true;
    } catch (error) {
      botLogger.botError(error, 'SEND_PROGRAMMATIC_MESSAGE');
      return false;
    }
  }

  // Método para obter informações do grupo
  async getGroupInfo(groupId) {
    try {
      if (!this.isConnected) {
        throw new Error('Bot não está conectado');
      }

      const groupMetadata = await this.sock.groupMetadata(groupId);
      return groupMetadata;
    } catch (error) {
      botLogger.botError(error, 'GET_GROUP_INFO');
      return null;
    }
  }

  // Método para obter status da conexão
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      botNumber: config.whatsapp.botNumber,
      rootNumbers: config.whatsapp.rootNumbers
    };
  }

  // Método para notificar grupo técnico
  async notifyTechnicalGroup(message) {
    try {
      if (!this.isConnected) {
        console.log('⚠️ Bot não conectado - mensagem não enviada para grupo técnico');
        return false;
      }

      // Buscar grupo técnico do banco de dados
      const database = require('./db/database');
      const groupId = await database.obterGrupoTecnico();
      
      if (!groupId) {
        console.log('⚠️ ID do grupo técnico não configurado');
        return false;
      }

      await this.sock.sendMessage(groupId, { text: message });
      botLogger.messageSent(groupId, message);
      return true;
    } catch (error) {
      botLogger.botError(error, 'NOTIFY_TECHNICAL_GROUP');
      console.error('Erro ao notificar grupo técnico:', error);
      return false;
    }
  }

  // Método para criar backup manual
  async createManualBackup() {
    try {
      const result = await backupManager.createBackup('manual');
      return result;
    } catch (error) {
      botLogger.botError(error, 'MANUAL_BACKUP');
      return { success: false, error: error.message };
    }
  }

  // Método para exportar OS
  async exportOS(osId) {
    try {
      const result = await backupManager.exportOSToFile(osId);
      return result;
    } catch (error) {
      botLogger.botError(error, 'EXPORT_OS');
      return { success: false, error: error.message };
    }
  }
}

// Instanciar e iniciar o bot
const bot = new WhatsAppBot();

// Handlers para encerramento gracioso
process.on('SIGINT', () => {
  console.log('\n🛑 Recebido SIGINT, encerrando bot...');
  bot.stop();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido SIGTERM, encerrando bot...');
  bot.stop();
});

// Iniciar o bot
bot.start().catch(error => {
  console.error('❌ Erro fatal ao iniciar bot:', error);
  process.exit(1);
});

// Exportar para uso em outros módulos
module.exports = bot;
