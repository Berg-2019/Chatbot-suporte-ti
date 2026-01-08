require('dotenv').config();

const config = {
  // Configurações da API Ollama
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2:3b'
  },

  // Configurações do WhatsApp
  whatsapp: {
    botNumber: process.env.BOT_NUMBER || '5569981248816',
    rootNumbers: process.env.ROOT_NUMBERS ? process.env.ROOT_NUMBERS.split(',') : ['556981170027', '556884268042', '5569981170027'],
    sessionPath: './auth_info_baileys',
    grupoTecnico: 'H6Mb8FQAnhaJhY5RdyIKjP@g.us' // ID do grupo técnico
  },

  // Configurações do banco de dados
  database: {
    path: process.env.DB_PATH || './db/atendimento.db'
  },

  // Configurações de log
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: './logs/bot.log'
  },

  // Configurações de e-mail
  email: {
    enabled: process.env.EMAIL_ENABLED !== 'false', // Nova opção para habilitar/desabilitar emails
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'bot@empresa.com',
    adminEmails: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []
  },

  // Mensagens padrão
  messages: {
    saudacao: process.env.MENSAGEM_SAUDACAO || 'Olá! Sou o assistente técnico. Como posso ajudá-lo hoje?\n\nPara abrir um chamado, use o comando !abrir ou simplesmente descreva seu problema.',
    final: process.env.MENSAGEM_FINAL || 'Atendimento finalizado. Obrigado por utilizar nossos serviços!',
    ajuda: `
🤖 *COMANDOS DISPONÍVEIS*

*USUÁRIOS:*
• !ajuda - Lista de comandos
• !status [id] - Ver status da OS
• !cancelar [id] - Cancelar OS
• !abrir - Abrir um novo chamado

*TÉCNICOS:*
• !menu - Exibir comandos técnicos
• !atendendo [id] - Assumir OS
• !prioridade [id] - Marcar como prioritário
• !setor [id]=[setor] - Alterar setor
• !mensagem [id]=[texto] - Enviar mensagem ao solicitante
• !list - Listar OS abertas
• !finalizado [id] - Marcar como finalizado
• !adm - Chamar administrador

*ADMINISTRADORES:*
• !config - Menu de configurações
• !listtc - Listar técnicos
• !listadm - Listar administradores
• !menss=[texto] - Alterar saudação
• !msfinal=[texto] - Alterar mensagem final
• !ping - Tempo de resposta
• !tecnico=[num] - Tornar técnico
• !adm=[num] - Tornar administrador
• !almoxarifado=[num] - Tornar almoxarifado
• !historico - Ver histórico de OS

*PEÇAS:*
• !listpeças [id_os] - Solicitar peças para OS
• !pecas - Ver solicitações de peças (almoxarifado)
• !atender [id_solicitacao] - Atender solicitação (almoxarifado)
    `
  },

  // Hierarquia de usuários
  userRoles: {
    ROOT: 'root',
    ADMIN: 'admin',
    TECNICO: 'tecnico',
    ALMOXARIFADO: 'almoxarifado',
    USER: 'user'
  },

  // Status das OS
  orderStatus: {
    ABERTA: 'aberta',
    EM_ANDAMENTO: 'em_andamento',
    FINALIZADA: 'finalizada',
    CANCELADA: 'cancelada'
  },

  // Status das solicitações de peças
  partsStatus: {
    PENDENTE: 'pendente',
    EM_SEPARACAO: 'em_separacao',
    ATENDIDA: 'atendida',
    CANCELADA: 'cancelada'
  },

  // Configurações de limpeza automática
  cleanup: {
    daysToKeep: 365 // Dias para manter OS no histórico (1 ano)
  },

  // Configurações do sistema
  system: {
    maxMemoryUsage: '512MB',
    storageLimit: '2GB',
    backupPath: './backups',
    exportPath: './exports',
    backupInterval: 24, // horas
    enableAutoBackup: true
  },

  // Configurações de autenticação
  auth: {
    rootUser: '556981170027',
    defaultPassword: 'admin847523',
    sessionTimeout: 3600000 // 1 hora em ms
  }
};

module.exports = config;
