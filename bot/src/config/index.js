/**
 * Configuração do Bot
 */

export const config = {
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },

  // Backend API
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:3000',
  },

  // GLPI (usado diretamente pelo bot para criar tickets)
  glpi: {
    url: process.env.GLPI_URL || 'http://localhost:8080/apirest.php',
    appToken: process.env.GLPI_APP_TOKEN || '',
    userToken: process.env.GLPI_USER_TOKEN || '',
  },

  // Bot
  bot: {
    sessionName: process.env.BOT_SESSION_NAME || 'helpdesk-bot',
    sessionPath: process.env.BOT_SESSION_PATH || './sessions',
  },

  // Timeouts (em segundos)
  timeouts: {
    sessionTTL: 300, // 5 minutos para expirar sessão de conversa
    glpiSessionTTL: 3600, // 1 hora para token GLPI
  },

  // Filas RabbitMQ
  queues: {
    INCOMING_MESSAGES: 'incoming_messages',
    OUTGOING_MESSAGES: 'outgoing_messages',
    CREATE_TICKET: 'create_ticket',
    UPDATE_TICKET: 'update_ticket',
    NOTIFICATIONS: 'notifications',
  },

  // Setores disponíveis
  sectors: [
    { id: 1, name: 'TI - Infraestrutura', keywords: ['rede', 'internet', 'vpn', 'wifi'] },
    { id: 2, name: 'TI - Sistemas', keywords: ['sistema', 'lotus', 'movtrans', 'erro'] },
    { id: 3, name: 'TI - Hardware', keywords: ['computador', 'impressora', 'teclado', 'mouse'] },
    { id: 4, name: 'Administrativo', keywords: ['documento', 'acesso', 'usuario'] },
  ],

  // Mensagens do bot
  messages: {
    welcome: `👋 Olá! Sou o assistente de suporte técnico.

Como posso ajudar você hoje?

1️⃣ Abrir chamado de TI
2️⃣ Consultar status de chamado
3️⃣ Falar com um técnico

Digite o número da opção desejada:`,

    askSector: `📋 Qual setor você precisa de suporte?

1️⃣ TI - Infraestrutura (rede, internet, VPN)
2️⃣ TI - Sistemas (Lotus, Movtrans, sistemas)
3️⃣ TI - Hardware (computador, impressora)
4️⃣ Administrativo

Digite o número:`,

    askProblem: '📝 Descreva brevemente o seu problema:',

    askLocation: '📍 Qual sua localização? (Setor/Sala)',

    confirmTicket: (data) => `✅ Vou criar seu chamado com os dados:

📋 **Setor:** ${data.sector}
📝 **Problema:** ${data.problem}
📍 **Local:** ${data.location}

Confirma? (sim/não)`,

    ticketCreated: (ticketId) => `🎫 Chamado **#${ticketId}** criado com sucesso!

Você receberá atualizações por aqui.
Um técnico entrará em contato em breve.`,

    transferToHuman: '🧑‍💻 Estou transferindo você para um técnico. Aguarde um momento...',

    timeout: '⏰ Sua sessão expirou. Digite *oi* para começar novamente.',

    error: '❌ Ocorreu um erro. Por favor, tente novamente.',

    invalidOption: '❓ Opção inválida. Por favor, escolha uma das opções disponíveis.',
  },
};
