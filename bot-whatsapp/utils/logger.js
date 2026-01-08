const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Criar diretório de logs se não existir
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configurar formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Criar logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  transports: [
    // Log para arquivo
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Log para console em desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    })
  ]
});

// Métodos específicos para o bot
const botLogger = {
  // Log de conexão WhatsApp
  connection: (status, details = '') => {
    logger.info(`WhatsApp Connection: ${status} ${details}`);
  },

  // Log de mensagens recebidas
  messageReceived: (from, message) => {
    logger.info(`Message from ${from}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  },

  // Log de mensagens enviadas
  messageSent: (to, message) => {
    logger.info(`Message sent to ${to}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  },

  // Log de comandos executados
  commandExecuted: (user, command, success = true) => {
    const status = success ? 'SUCCESS' : 'FAILED';
    logger.info(`Command [${status}] - User: ${user}, Command: ${command}`);
  },

  // Log de criação de OS
  orderCreated: (osId, user, problem) => {
    logger.info(`New Order Created - ID: ${osId}, User: ${user}, Problem: ${problem.substring(0, 50)}...`);
  },

  // Log de alterações de status
  statusChanged: (osId, oldStatus, newStatus, user) => {
    logger.info(`Order Status Changed - ID: ${osId}, ${oldStatus} -> ${newStatus}, Changed by: ${user}`);
  },

  // Log de erros específicos do bot
  botError: (error, context = '') => {
    logger.error(`Bot Error ${context}: ${error.message}`, { stack: error.stack });
  },

  // Log de autenticação
  auth: (event, details = '') => {
    logger.info(`Auth Event: ${event} ${details}`);
  },

  // Log de QR Code
  qrCode: () => {
    logger.info('QR Code generated - Waiting for scan');
  },

  // Log de usuários
  userAction: (phone, action, details = '') => {
    logger.info(`User Action - Phone: ${phone}, Action: ${action}, Details: ${details}`);
  },

  // Log de limpeza automática
  cleanup: (deletedCount) => {
    logger.info(`Automatic cleanup completed - Deleted ${deletedCount} old records`);
  },

  // Log de estatísticas
  stats: (stats) => {
    logger.info(`System Stats: ${JSON.stringify(stats)}`);
  },

  // Log de backup
  backup: (backupName, sizeMB, type) => {
    logger.info(`Backup Created - Type: ${type.toUpperCase()}, File: ${backupName}, Size: ${sizeMB} MB`);
  },

  // Log de exportação
  export: (fileName, sizeMB, type) => {
    logger.info(`Export Created - Type: ${type.toUpperCase()}, File: ${fileName}, Size: ${sizeMB} MB`);
  },

  // Log de configurações
  configChanged: (key, oldValue, newValue, user) => {
    logger.info(`Config Changed - Key: ${key}, Old: ${oldValue}, New: ${newValue}, By: ${user}`);
  },

  // Log de sistema
  systemInfo: (info) => {
    logger.info(`System Info - Memory: ${info.memory}MB, Uptime: ${info.uptime}h, DB Size: ${info.dbSize}MB`);
  }
};

// Função para rotacionar logs manualmente
const rotateLogs = () => {
  const logFile = config.logging.file;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `${logFile}.${timestamp}`;
  
  try {
    if (fs.existsSync(logFile)) {
      fs.renameSync(logFile, backupFile);
      logger.info(`Log rotated to ${backupFile}`);
    }
  } catch (error) {
    logger.error('Failed to rotate logs:', error);
  }
};

// Função para obter logs recentes
const getRecentLogs = (lines = 100) => {
  try {
    const logFile = config.logging.file;
    if (!fs.existsSync(logFile)) {
      return 'Log file not found';
    }

    const data = fs.readFileSync(logFile, 'utf8');
    const logLines = data.split('\n').filter(line => line.trim());
    
    return logLines.slice(-lines).join('\n');
  } catch (error) {
    logger.error('Failed to read recent logs:', error);
    return 'Error reading logs';
  }
};

// Função para limpar logs antigos
const cleanOldLogs = (daysToKeep = 30) => {
  try {
    const logDir = path.dirname(config.logging.file);
    const files = fs.readdirSync(logDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;
    files.forEach(file => {
      if (file.includes('.log.')) {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    });

    if (deletedCount > 0) {
      logger.info(`Cleaned ${deletedCount} old log files`);
    }
  } catch (error) {
    logger.error('Failed to clean old logs:', error);
  }
};

// Middleware para capturar erros não tratados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {
  logger,
  botLogger,
  rotateLogs,
  getRecentLogs,
  cleanOldLogs
};
