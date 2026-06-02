export const SESSION_TTL = 600; // 10 minutes
export const SESSION_PREFIX = 'wa:session:';
export const STATUS_KEY = 'wa:bot:status';
export const RECONNECT_DELAY = 5000;
export const SESSION_DIR = './sessions';

export const MESSAGES = {
  greeting: `Olá! 👋 Sou o assistente de suporte técnico do MSM Helpdesk.

Como posso te ajudar hoje? Descreva seu problema ou dúvida que vou te direcionar.`,

  askProblem: 'Me conte mais detalhes sobre o problema que está enfrentando:',

  askLocation: '📍 Em qual setor/sala você está localizado?',

  confirmTicket: (data: { sector: string; problem: string; location: string }) =>
    `Vou criar seu chamado com os seguintes dados:

📋 *Setor:* ${data.sector === 'TI' ? 'Tecnologia da Informação' : 'Elétrica'}
📝 *Problema:* ${data.problem}
📍 *Local:* ${data.location}

Confirma? Responda *sim* ou *não*.`,

  ticketCreated: (ticketNumber: string) =>
    `✅ Chamado *#${ticketNumber}* criado com sucesso!

Você receberá atualizações por aqui. Um técnico entrará em contato em breve.`,

  ticketNotFound: 'Não encontrei chamados recentes para seu número. Descreva seu problema que abro um novo.',

  transferToAgent: 'Vou transferir para um técnico. Aguarde um momento...',

  csatRequest: (ticketNumber: string) =>
    `Seu chamado *#${ticketNumber}* foi finalizado! 🎉

Como você avalia o atendimento? Responda com uma nota de *1* a *5*:
1⭐ Péssimo
2⭐ Ruim
3⭐ Regular
4⭐ Bom
5⭐ Excelente`,

  csatThanks: (score: number) =>
    score >= 4
      ? `Obrigado pela avaliação! 😊 Fico feliz que o atendimento foi bom. Se precisar de algo, é só chamar!`
      : `Obrigado pela avaliação. Vamos trabalhar para melhorar. Se precisar de algo, estamos aqui!`,

  invalidOption: 'Não entendi sua resposta. Pode reformular?',

  timeout: 'Sua sessão expirou por inatividade. Envie uma mensagem para começar novamente.',

  error: 'Ocorreu um erro. Por favor, tente novamente em alguns instantes.',

  cancelledTicket: 'Chamado cancelado. Se precisar de ajuda, é só chamar!',
};
