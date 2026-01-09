/**
 * Bot de Atendimento WhatsApp
 * Baseado na estrutura do Takeshi Bot
 * 
 * Conexão via Código de Pareamento
 */
const makeWASocket = require('baileys').default;
const {
  DisconnectReason,
  isJidBroadcast,
  isJidStatusBroadcast,
  isJidNewsletter,
  useMultiFileAuthState,
} = require('baileys');
const NodeCache = require('node-cache');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Importar módulos do bot
const config = require('./config/config');
const database = require('./db/database');
const commandHandler = require('./handlers/commands');
const { botLogger } = require('./utils/logger');
const backupManager = require('./utils/backup');
const { ensureOllamaRunning } = require('./utils/ollama-fix');
const { sendAdminNotification } = require('./config/email');

// Versão do WhatsApp Web (mesma do takeshi-bot)
const WAWEB_VERSION = [2, 3000, 1030831524];

// Diretório de autenticação
const AUTH_DIR = path.resolve(__dirname, 'auth_info_baileys');

// Diretório temporário para logs
const TEMP_DIR = path.resolve(__dirname, 'temp');

// Criar diretórios necessários
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// Configuração do logger pino
const logger = pino(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  pino.destination(path.join(TEMP_DIR, 'wa-logs.txt'))
);
logger.level = 'error';

// Cache para retry de mensagens
const msgRetryCounterCache = new NodeCache();

// Interface readline para entrada do usuário
function question(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(message, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

// Função para extrair apenas números
function onlyNumbers(text) {
  return text.replace(/[^0-9]/g, '');
}

// Logs coloridos (estilo takeshi-bot)
const sayLog = (message) => console.log('\x1b[36m[BOT | TALK]\x1b[0m', message);
const infoLog = (message) => console.log('\x1b[34m[BOT | INFO]\x1b[0m', message);
const successLog = (message) => console.log('\x1b[32m[BOT | SUCCESS]\x1b[0m', message);
const errorLog = (message) => console.log('\x1b[31m[BOT | ERROR]\x1b[0m', message);
const warningLog = (message) => console.log('\x1b[33m[BOT | WARNING]\x1b[0m', message);

function bannerLog() {
  console.log('\x1b[36m═══════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[36m   🤖 BOT DE ATENDIMENTO WHATSAPP v2.0.0\x1b[0m');
  console.log('\x1b[36m   📱 Conexão via Código de Pareamento\x1b[0m');
  console.log('\x1b[36m═══════════════════════════════════════════════════════\x1b[0m\n');
}

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // Inicializar limpeza automática
    this.setupCleanupSchedule();
    
    // Inicializar sistema de backup
    this.initializeBackupSystem();
  }

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    this.sock = makeWASocket({
      version: WAWEB_VERSION,
      logger,
      defaultQueryTimeoutMs: undefined,
      retryRequestDelayMs: 5000,
      auth: state,
      shouldIgnoreJid: (jid) =>
        isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid),
      connectTimeoutMs: 20000,
      keepAliveIntervalMs: 30000,
      maxMsgRetryCount: 5,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      emitOwnEvents: false,
      msgRetryCounterCache,
      shouldSyncHistoryMessage: () => false,
    });

    // Se não registrado, solicitar código de pareamento
    if (!this.sock.authState.creds.registered) {
      warningLog('Credenciais não configuradas!');
      
      console.log('\n' + '═'.repeat(55));
      infoLog('Informe o número de telefone do bot (exemplo: "5569981020588"):');
      console.log('═'.repeat(55));

      const phoneNumber = await question('\n📞 Digite o número: ');

      if (!phoneNumber) {
        errorLog('Número de telefone inválido! Tente novamente com "npm start".');
        process.exit(1);
      }

      const code = await this.sock.requestPairingCode(onlyNumbers(phoneNumber));

      console.log('\n' + '═'.repeat(55));
      console.log('\x1b[32m');
      console.log('   🔑 CÓDIGO DE PAREAMENTO:');
      console.log('');
      console.log(`      📱  ${code.match(/.{1,4}/g)?.join('-') || code}  📱`);
      console.log('\x1b[0m');
      console.log('═'.repeat(55));
      console.log('\n📝 INSTRUÇÕES:');
      console.log('   1. Abra o WhatsApp no seu celular');
      console.log('   2. Vá em: Configurações → Aparelhos Conectados');
      console.log('   3. Toque em "Conectar um aparelho"');
      console.log('   4. Selecione "Conectar com número de telefone"');
      console.log('   5. Digite o código acima');
      console.log('\n⏰ O código expira em 60 segundos!\n');
    }

    // Event handlers
    this.sock.ev.on('connection.update', async (update) => {
      await this.handleConnectionUpdate(update);
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async (messageUpdate) => {
      await this.handleIncomingMessages(messageUpdate);
    });

    return this.sock;
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      this.isConnected = false;
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode;

      botLogger.connection('CLOSED', `Reason: ${statusCode}`);

      if (statusCode === DisconnectReason.loggedOut) {
        errorLog('Bot desconectado!');
        
        // Limpar sessão
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        
        infoLog('Sessão limpa. Execute novamente com "npm start".');
        process.exit(0);
      } else {
        switch (statusCode) {
          case DisconnectReason.badSession:
            warningLog('Sessão inválida!');
            break;
          case DisconnectReason.connectionClosed:
            warningLog('Conexão fechada!');
            break;
          case DisconnectReason.connectionLost:
            warningLog('Conexão perdida!');
            break;
          case DisconnectReason.connectionReplaced:
            warningLog('Conexão substituída!');
            break;
          case DisconnectReason.multideviceMismatch:
            warningLog('Dispositivo incompatível!');
            break;
          case DisconnectReason.forbidden:
            warningLog('Conexão proibida!');
            break;
          case DisconnectReason.restartRequired:
            infoLog('Reinicie por favor! Digite "npm start".');
            break;
          case DisconnectReason.unavailableService:
            warningLog('Serviço indisponível!');
            break;
          case 401:
            warningLog('Erro de autenticação (401)!');
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
            infoLog('Sessão limpa. Execute novamente.');
            process.exit(0);
            break;
          default:
            warningLog(`Erro desconhecido: ${statusCode}`);
        }

        // Reconectar
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          warningLog(`Reconectando... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(async () => {
            await this.connect();
          }, 5000);
        } else {
          errorLog('Máximo de tentativas de reconexão atingido.');
          process.exit(1);
        }
      }
    } else if (connection === 'open') {
      this.isConnected = true;
      this.reconnectAttempts = 0;

      botLogger.connection('OPEN', 'Bot conectado com sucesso');
      
      console.log('\n' + '═'.repeat(55));
      successLog('✅ BOT CONECTADO COM SUCESSO!');
      console.log('═'.repeat(55));
      infoLog(`Versão do WhatsApp Web: ${WAWEB_VERSION.join('.')}`);
      infoLog(`Número do bot: ${config.whatsapp.botNumber}`);
      infoLog(`Números root: ${config.whatsapp.rootNumbers.join(', ')}`);
      successLog('🎯 Bot pronto para receber mensagens!');
      console.log('═'.repeat(55) + '\n');

      // Notificar roots
      this.notifyRootUsers('🤖 Bot de Atendimento iniciado com sucesso!');
    } else {
      infoLog('Atualizando conexão...');
    }
  }

  async handleIncomingMessages(messageUpdate) {
    try {
      const messages = messageUpdate.messages;
      
      for (const message of messages) {
        // Ignorar mensagens próprias e de status
        if (message.key.fromMe || message.key.remoteJid === 'status@broadcast') {
          continue;
        }

        // Ignorar broadcasts e newsletters
        if (isJidBroadcast(message.key.remoteJid) || 
            isJidStatusBroadcast(message.key.remoteJid) || 
            isJidNewsletter(message.key.remoteJid)) {
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

        // Verificar se é o grupo técnico
        const grupoTecnicoId = await database.obterGrupoTecnico();
        const isGrupoTecnico = from === grupoTecnicoId;
        
        // Verificar se é um grupo regular
        const isGrupoRegular = isGroup && !isGrupoTecnico;
        
        // Processar respostas automáticas para grupos regulares
        if (isGrupoRegular) {
          if (text.toLowerCase().includes('oi bot')) {
            let senderName = message.pushName || senderPhone;
            const responseText = `Olá ${senderName}, sou o bot do grupo!`;
            
            try {
              await this.sock.sendMessage(from, { text: responseText });
              botLogger.messageSent(from, responseText);
            } catch (error) {
              botLogger.botError(error, 'SEND_MESSAGE');
            }
            continue;
          }
          
          if (text.trim() === '!ajuda') {
            const responseText = 'Aqui está a lista de comandos disponíveis...';
            try {
              await this.sock.sendMessage(from, { text: responseText });
              botLogger.messageSent(from, responseText);
            } catch (error) {
              botLogger.botError(error, 'SEND_MESSAGE');
            }
            continue;
          }
        }
        
        // Processar mensagens do grupo técnico ou mensagens privadas
        if (!isGroup || isGrupoTecnico || text.includes(`@${config.whatsapp.botNumber}`) || text.startsWith('!') || text.toLowerCase().startsWith('chamado')) {
          const sendMessage = async (responseText) => {
            try {
              await this.sock.sendMessage(from, { text: responseText });
              botLogger.messageSent(from, responseText);
            } catch (error) {
              botLogger.botError(error, 'SEND_MESSAGE');
            }
          };

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
      
      let senderPhone;
      if (isGroup) {
        senderPhone = message.key.participant?.replace('@s.whatsapp.net', '').replace(/@lid$/, '') || '';
      } else {
        senderPhone = from.replace('@s.whatsapp.net', '').replace(/@lid$/, '');
      }

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
    const rootNumbers = config.whatsapp.rootNumbers;
    
    if (rootNumbers.length === 0) {
      botLogger.systemInfo('Nenhum número root configurado');
      return;
    }
    
    const primaryRoot = rootNumbers[0];
    const primaryJid = `${primaryRoot}@s.whatsapp.net`;
    
    try {
      await this.sock.sendMessage(primaryJid, { text: message });
      botLogger.messageSent(primaryJid, message);
      successLog(`Mensagem enviada para root principal: ${primaryRoot}`);
    } catch (error) {
      botLogger.botError(error, `NOTIFY_ROOT_PRIMARY_${primaryRoot}`);
      warningLog(`Falha ao enviar para root principal: ${primaryRoot}`);
      
      // Tentar roots secundários
      for (let i = 1; i < rootNumbers.length; i++) {
        const secondaryRoot = rootNumbers[i];
        const secondaryJid = `${secondaryRoot}@s.whatsapp.net`;
        
        try {
          await this.sock.sendMessage(secondaryJid, { text: message });
          successLog(`Mensagem enviada para root secundário: ${secondaryRoot}`);
          break;
        } catch (secondaryError) {
          warningLog(`Falha ao enviar para root secundário: ${secondaryRoot}`);
        }
      }
    }
  }

  setupCleanupSchedule() {
    setInterval(async () => {
      try {
        const deletedCount = await database.limparHistoricoAntigo();
        if (deletedCount > 0) {
          botLogger.cleanup(deletedCount);
          infoLog(`Limpeza automática: ${deletedCount} registros removidos`);
        }
      } catch (error) {
        botLogger.botError(error, 'AUTO_CLEANUP');
      }
    }, 24 * 60 * 60 * 1000);
  }

  initializeBackupSystem() {
    infoLog('Inicializando sistema de backup...');
    
    botLogger.systemInfo({
      memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
      uptime: Math.floor(process.uptime() / 3600),
      dbSize: 'N/A'
    });
  }

  async stop() {
    try {
      botLogger.connection('STOPPING', 'Parando bot...');
      infoLog('Parando bot...');
      
      if (this.sock) {
        await this.sock.logout();
      }
      
      await database.close();
      
      successLog('Bot parado com sucesso!');
      process.exit(0);
    } catch (error) {
      botLogger.botError(error, 'STOP');
      process.exit(1);
    }
  }

  // Métodos públicos
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

  async getGroupInfo(groupId) {
    try {
      if (!this.isConnected) {
        throw new Error('Bot não está conectado');
      }
      return await this.sock.groupMetadata(groupId);
    } catch (error) {
      botLogger.botError(error, 'GET_GROUP_INFO');
      return null;
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      botNumber: config.whatsapp.botNumber,
      rootNumbers: config.whatsapp.rootNumbers
    };
  }

  async notifyTechnicalGroup(message) {
    try {
      if (!this.isConnected) {
        warningLog('Bot não conectado');
        return false;
      }

      const groupId = await database.obterGrupoTecnico();
      
      if (!groupId) {
        warningLog('ID do grupo técnico não configurado');
        return false;
      }

      await this.sock.sendMessage(groupId, { text: message });
      botLogger.messageSent(groupId, message);
      return true;
    } catch (error) {
      botLogger.botError(error, 'NOTIFY_TECHNICAL_GROUP');
      return false;
    }
  }

  async createManualBackup() {
    try {
      return await backupManager.createBackup('manual');
    } catch (error) {
      botLogger.botError(error, 'MANUAL_BACKUP');
      return { success: false, error: error.message };
    }
  }

  async exportOS(osId) {
    try {
      return await backupManager.exportOSToFile(osId);
    } catch (error) {
      botLogger.botError(error, 'EXPORT_OS');
      return { success: false, error: error.message };
    }
  }
}

// ====== INICIALIZAÇÃO ======

async function startBot() {
  try {
    process.setMaxListeners(1500);

    bannerLog();
    infoLog('Iniciando componentes internos...');

    const bot = new WhatsAppBot();
    
    await bot.connect();

    successLog('Bot iniciado com sucesso!');

    // Handlers para encerramento gracioso
    process.on('SIGINT', () => {
      console.log('\n');
      warningLog('Recebido SIGINT, encerrando...');
      bot.stop();
    });

    process.on('SIGTERM', () => {
      console.log('\n');
      warningLog('Recebido SIGTERM, encerrando...');
      bot.stop();
    });

    // Exportar para uso em outros módulos
    module.exports = bot;

  } catch (error) {
    errorLog(`Erro ao iniciar o bot: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  errorLog(`Erro crítico não capturado: ${error.message}`);
  console.error(error.stack);
  
  if (!error.message.includes('ENOTFOUND') && !error.message.includes('timeout')) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  errorLog(`Promessa rejeitada não tratada: ${reason}`);
});

// Iniciar
startBot();
