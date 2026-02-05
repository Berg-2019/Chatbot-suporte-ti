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
    sessionTTL: 7200, // 2 horas para sessão normal (era 5 minutos)
    sessionTTLWaitingTechnician: 86400, // 24 horas quando aguardando técnico
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

  // Setores disponíveis - TI
  sectorsTI: [
    { id: 1, name: 'TI - Infraestrutura', keywords: ['rede', 'internet', 'vpn', 'wifi', 'servidor'] },
    { id: 2, name: 'TI - Sistemas', keywords: ['sistema', 'lotus', 'movtrans', 'erro', 'software'] },
    { id: 3, name: 'TI - Hardware', keywords: ['computador', 'impressora', 'teclado', 'mouse', 'monitor'] },
    { id: 4, name: 'TI - Administrativo', keywords: ['documento', 'acesso', 'usuario', 'email'] },
  ],

  // Setores disponíveis - Elétrica
  sectorsElectric: [
    { id: 10, name: 'Elétrica - Iluminação', keywords: ['luz', 'lâmpada', 'lampada', 'fluorescente', 'led'] },
    { id: 11, name: 'Elétrica - Tomadas', keywords: ['tomada', 'extensão', 'filtro', 'energia'] },
    { id: 12, name: 'Elétrica - Disjuntores', keywords: ['disjuntor', 'queda', 'curto', 'desarme'] },
    { id: 13, name: 'Elétrica - Ar Condicionado', keywords: ['ar', 'refrigeração', 'climatização', 'split'] },
    { id: 14, name: 'Elétrica - Manutenção Geral', keywords: ['fiação', 'eletrica', 'elétrica', 'instalação'] },
  ],

  // Mensagens do bot
  messages: {
    welcome: `👋 Olá! Sou o assistente de suporte.

Como posso ajudar você hoje?

1️⃣ Abrir chamado de TI
2️⃣ Abrir chamado de Elétrica
3️⃣ Consultar status de chamado
4️⃣ Falar com um técnico
5️⃣ Reservar equipamento 📦

Digite o número da opção desejada:`,

    askSectorTI: `📋 Qual área de TI você precisa de suporte?

1️⃣ Infraestrutura (rede, internet, VPN)
2️⃣ Sistemas (Lotus, Movtrans, softwares)
3️⃣ Hardware (computador, impressora)
4️⃣ Administrativo (acesso, email, usuário)

Digite o número:`,

    askSectorElectric: `⚡ Qual tipo de serviço elétrico você precisa?

1️⃣ Iluminação (lâmpadas, luminárias)
2️⃣ Tomadas (instalação, conserto)
3️⃣ Disjuntores (queda de energia, curto)
4️⃣ Ar Condicionado (manutenção, instalação)
5️⃣ Manutenção Geral (fiação, instalação)

Digite o número:`,

    askDepartment: '🏢 Em qual *setor/departamento* você trabalha?\n\nExemplo: Financeiro, RH, Produção, Administrativo, etc.',

    askProblem: '📝 Descreva brevemente o seu problema:',

    askLocation: '📍 Qual sua localização? (Setor/Sala)',

    confirmTicket: (data) => `✅ Vou criar seu chamado com os dados:

🏢 **Setor do Solicitante:** ${data.userDepartment || data.sector}
📋 **Categoria:** ${data.category || data.sector}
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

    // Reservation messages
    askEquipmentType: `📦 *Reserva de Equipamento*\n\nQual tipo de equipamento você deseja reservar?\n\n1️⃣ TI (notebooks, projetores, etc.)\n2️⃣ Elétrica (ferramentas, instrumentos, etc.)\n\nDigite o número:`,

    askEquipmentList: (items) => `📦 *Equipamentos disponíveis para reserva:*\n\n${items.map((item, i) => `${i + 1}️⃣ ${item.name} (${item.assetTag || 'S/N'})`).join('\n')}\n\nDigite o número do equipamento:`,

    askReservationDate: '📅 Quando você precisa do equipamento?\n\nDigite a *data de início* no formato:\n`DD/MM/AAAA HH:MM`\n\nExemplo: 30/01/2026 14:00',

    askReservationEnd: '📅 Até quando você precisa?\n\nDigite a *data de devolução* no formato:\n`DD/MM/AAAA HH:MM`',

    askReservationReason: '📝 Qual o motivo da reserva? (opcional, digite "pular" para não informar)',

    confirmReservation: (data) => `✅ Confirma a reserva?\n\n📦 *Equipamento:* ${data.equipmentName}\n📅 *De:* ${data.startDate}\n📅 *Até:* ${data.endDate}\n${data.reason ? `📝 *Motivo:* ${data.reason}` : ''}\n\nDigite *sim* para confirmar ou *não* para cancelar:`,

    reservationCreated: '🎉 Reserva solicitada com sucesso!\n\nVocê receberá uma notificação quando for aprovada pelo técnico.',

    noEquipmentsAvailable: '😔 No momento não há equipamentos disponíveis para reserva.\n\nDigite *menu* para voltar ao início.',
  },
};
