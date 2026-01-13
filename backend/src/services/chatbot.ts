/**
 * Serviço de Chatbot - Primeiro Atendimento
 * Coleta dados e decide handoff para humano
 */

import database from '../config/database.js';
import whatsappService from './whatsapp.js';
import { Server as SocketIOServer } from 'socket.io';

// Setores disponíveis
const SETORES = [
  { id: 1, nome: 'RH' },
  { id: 2, nome: 'Engenharia' },
  { id: 3, nome: 'Licitação' },
  { id: 4, nome: 'Compras' },
  { id: 5, nome: 'Transporte' },
  { id: 6, nome: 'Vendas' },
  { id: 7, nome: 'Controladoria' },
  { id: 8, nome: 'Apropriação' },
  { id: 9, nome: 'Posto Rio Branco' },
  { id: 10, nome: 'Posto Porto Velho' },
  { id: 11, nome: 'Escritório de Pedreira' },
  { id: 12, nome: 'Usina de Asfalto' },
  { id: 13, nome: 'Usina de Concreto' },
  { id: 14, nome: 'Laboratório de Concreto' },
  { id: 15, nome: 'Adm. Posto Rio Branco e Porto Velho' },
];

// Tipos de chamado
const TIPOS_CHAMADO = [
  { id: 1, nome: 'Outros', skill: 'geral' },
  { id: 2, nome: 'Ponto eletrônico', skill: 'sistemas' },
  { id: 3, nome: 'Servidores/Acesso Remoto', skill: 'rede' },
  { id: 4, nome: 'Sistemas (LOTUS/MOVTRANS/Balança)', skill: 'sistemas' },
  { id: 5, nome: 'Acessórios (teclado, mouse)', skill: 'hardware' },
  { id: 6, nome: 'Manutenção de PC', skill: 'hardware' },
  { id: 7, nome: 'Reposição de tinta', skill: 'hardware' },
];

// Estados do fluxo
type FlowStep = 'inicio' | 'setor' | 'tipo' | 'local' | 'equipamento' | 'patrimonio' | 'problema' | 'confirmacao' | 'aguardando' | 'atendendo';

interface BotSession {
  step: FlowStep;
  data: {
    nome?: string;
    setor?: string;
    tipo?: string;
    tipoSkill?: string;
    local?: string;
    equipamento?: string;
    patrimonio?: string;
    problema?: string;
  };
  ticketId?: number;
}

// Cache de sessões (em produção, usar Redis)
const sessions = new Map<string, BotSession>();

class ChatbotService {
  private io: SocketIOServer | null = null;

  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Processa mensagem do cliente
   */
  async processMessage(phone: string, text: string, msgId: string): Promise<void> {
    const cleanText = text.trim().toLowerCase();

    // Buscar ticket existente em atendimento humano
    const existingTicket = await database.get<{ id: number; status: string; assigned_to: number | null }>(
      `SELECT id, status, assigned_to FROM tickets WHERE customer_phone = ? AND status NOT IN ('closed') ORDER BY id DESC LIMIT 1`,
      [phone]
    );

    // Se já está em atendimento humano, encaminhar para o técnico
    if (existingTicket && existingTicket.status === 'in_progress' && existingTicket.assigned_to) {
      await this.saveMessage(existingTicket.id, 'customer', null, null, text, msgId);
      this.emitNewMessage(existingTicket.id, {
        sender_type: 'customer',
        content: text,
        created_at: new Date().toISOString(),
      });
      return;
    }

    // Obter ou criar sessão
    let session = sessions.get(phone);
    if (!session) {
      session = { step: 'inicio', data: {} };
      sessions.set(phone, session);
    }

    // Processar de acordo com a etapa
    await this.handleStep(phone, text, session);
  }

  /**
   * Processa etapa do fluxo
   */
  private async handleStep(phone: string, text: string, session: BotSession): Promise<void> {
    const cleanText = text.trim();

    // Verificar cancelamento
    if (['cancelar', 'sair', 'voltar', '0'].includes(cleanText.toLowerCase())) {
      sessions.delete(phone);
      await this.sendBotMessage(phone, '❌ Atendimento cancelado. Digite *oi* para iniciar novamente.');
      return;
    }

    // Verificar handoff manual
    if (['falar com humano', 'humano', 'atendente', 'pessoa'].some(w => cleanText.toLowerCase().includes(w))) {
      await this.transferToHuman(phone, session, 'Solicitou atendimento humano');
      return;
    }

    switch (session.step) {
      case 'inicio':
        await this.handleInicio(phone, cleanText, session);
        break;
      case 'setor':
        await this.handleSetor(phone, cleanText, session);
        break;
      case 'tipo':
        await this.handleTipo(phone, cleanText, session);
        break;
      case 'local':
        await this.handleLocal(phone, cleanText, session);
        break;
      case 'equipamento':
        await this.handleEquipamento(phone, cleanText, session);
        break;
      case 'patrimonio':
        await this.handlePatrimonio(phone, cleanText, session);
        break;
      case 'problema':
        await this.handleProblema(phone, cleanText, session);
        break;
      case 'confirmacao':
        await this.handleConfirmacao(phone, cleanText, session);
        break;
      case 'aguardando':
        await this.sendBotMessage(phone, '⏳ Seu chamado já foi registrado e está na fila. Em breve um técnico irá atendê-lo.');
        break;
    }
  }

  private async handleInicio(phone: string, text: string, session: BotSession): Promise<void> {
    session.step = 'setor';
    session.data = {};
    sessions.set(phone, session);

    const setoresList = SETORES.map(s => `*${s.id}* - ${s.nome}`).join('\n');
    
    await this.sendBotMessage(phone, 
      `👋 Olá! Sou o assistente de suporte técnico.\n\nPara abrir um chamado, me diga:\n*De qual setor você está?*\n\n${setoresList}\n\n_Digite o número do setor:_`
    );
  }

  private async handleSetor(phone: string, text: string, session: BotSession): Promise<void> {
    const setorId = parseInt(text);
    const setor = SETORES.find(s => s.id === setorId);

    if (!setor) {
      await this.sendBotMessage(phone, '❌ Opção inválida. Por favor, digite o número do setor.');
      return;
    }

    session.data.setor = setor.nome;
    session.step = 'tipo';
    sessions.set(phone, session);

    const tiposList = TIPOS_CHAMADO.map(t => `*${t.id}* - ${t.nome}`).join('\n');

    await this.sendBotMessage(phone,
      `✅ Setor: *${setor.nome}*\n\n🔧 *Qual o tipo do problema?*\n\n${tiposList}\n\n_Digite o número:_`
    );
  }

  private async handleTipo(phone: string, text: string, session: BotSession): Promise<void> {
    const tipoId = parseInt(text);
    const tipo = TIPOS_CHAMADO.find(t => t.id === tipoId);

    if (!tipo) {
      await this.sendBotMessage(phone, '❌ Opção inválida. Por favor, digite o número do tipo de problema.');
      return;
    }

    session.data.tipo = tipo.nome;
    session.data.tipoSkill = tipo.skill;
    session.step = 'local';
    sessions.set(phone, session);

    await this.sendBotMessage(phone,
      `✅ Tipo: *${tipo.nome}*\n\n📍 *Informe o local do atendimento:*\n_(Ex: Sala 201, Recepção, Almoxarifado)_`
    );
  }

  private async handleLocal(phone: string, text: string, session: BotSession): Promise<void> {
    if (text.length < 2) {
      await this.sendBotMessage(phone, '⚠️ Por favor, informe um local válido.');
      return;
    }

    session.data.local = text;
    session.step = 'equipamento';
    sessions.set(phone, session);

    await this.sendBotMessage(phone,
      `💻 *Qual equipamento precisa de suporte?*\n_(Ex: Computador Dell, Impressora HP, Notebook)_`
    );
  }

  private async handleEquipamento(phone: string, text: string, session: BotSession): Promise<void> {
    if (text.length < 2) {
      await this.sendBotMessage(phone, '⚠️ Por favor, informe o equipamento.');
      return;
    }

    session.data.equipamento = text;
    session.step = 'patrimonio';
    sessions.set(phone, session);

    await this.sendBotMessage(phone,
      `🏷️ *Informe o número de patrimônio (se houver):*\n_(Digite "não tem" se não souber)_`
    );
  }

  private async handlePatrimonio(phone: string, text: string, session: BotSession): Promise<void> {
    const semPatrimonio = ['não tem', 'nao tem', 'n/a', 'na', '-', 'nenhum', 'não sei', 'nao sei'];
    session.data.patrimonio = semPatrimonio.includes(text.toLowerCase()) ? undefined : text;
    session.step = 'problema';
    sessions.set(phone, session);

    await this.sendBotMessage(phone, `📝 *Descreva detalhadamente o problema:*`);
  }

  private async handleProblema(phone: string, text: string, session: BotSession): Promise<void> {
    if (text.length < 10) {
      await this.sendBotMessage(phone, '⚠️ Por favor, descreva o problema com mais detalhes (mínimo 10 caracteres).');
      return;
    }

    session.data.problema = text;
    session.step = 'confirmacao';
    sessions.set(phone, session);

    const resumo = `📋 *CONFIRME OS DADOS DO CHAMADO:*

🏢 *Setor:* ${session.data.setor}
🔧 *Tipo:* ${session.data.tipo}
📍 *Local:* ${session.data.local}
💻 *Equipamento:* ${session.data.equipamento}
🏷️ *Patrimônio:* ${session.data.patrimonio || 'Não informado'}

📝 *Problema:*
${session.data.problema}

━━━━━━━━━━━━━━━━━━━━━
*1* - ✅ Confirmar e abrir chamado
*2* - 🔄 Recomeçar
*0* - ❌ Cancelar
━━━━━━━━━━━━━━━━━━━━━`;

    await this.sendBotMessage(phone, resumo);
  }

  private async handleConfirmacao(phone: string, text: string, session: BotSession): Promise<void> {
    switch (text) {
      case '1':
        await this.createTicket(phone, session);
        break;
      case '2':
        session.step = 'setor';
        session.data = {};
        sessions.set(phone, session);
        await this.handleInicio(phone, '', session);
        break;
      case '0':
        sessions.delete(phone);
        await this.sendBotMessage(phone, '❌ Atendimento cancelado.');
        break;
      default:
        await this.sendBotMessage(phone, '❌ Digite *1* para confirmar, *2* para recomeçar ou *0* para cancelar.');
    }
  }

  /**
   * Cria ticket e transfere para fila humana
   */
  private async createTicket(phone: string, session: BotSession): Promise<void> {
    // Encontrar fila adequada
    const queue = await database.get<{ id: number }>(
      `SELECT id FROM queues WHERE skills LIKE ? LIMIT 1`,
      [`%${session.data.tipoSkill}%`]
    ) || await database.get<{ id: number }>(`SELECT id FROM queues WHERE name = 'Geral'`);

    // Criar ticket
    const result = await database.run(
      `INSERT INTO tickets (customer_phone, sector, ticket_type, location, equipment, patrimony, problem, status, queue_id, bot_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?)`,
      [
        phone,
        session.data.setor,
        session.data.tipo,
        session.data.local,
        session.data.equipamento,
        session.data.patrimonio,
        session.data.problema,
        queue?.id || null,
        JSON.stringify(session.data),
      ]
    );

    session.ticketId = result.lastID;
    session.step = 'aguardando';
    sessions.set(phone, session);

    await this.sendBotMessage(phone,
      `✅ *Chamado #${result.lastID} criado com sucesso!*

Seu chamado foi registrado e está na fila de atendimento.

Um técnico irá atendê-lo em breve. Você será notificado quando o atendimento iniciar.

_Aguarde..._`
    );

    // Notificar painel via Socket.IO
    if (this.io) {
      const ticket = await database.get(
        `SELECT t.*, q.name as queue_name FROM tickets t LEFT JOIN queues q ON t.queue_id = q.id WHERE t.id = ?`,
        [result.lastID]
      );
      this.io.emit('ticket:new', ticket);
    }
  }

  /**
   * Transfere para atendimento humano
   */
  private async transferToHuman(phone: string, session: BotSession, reason: string): Promise<void> {
    // Encontrar fila geral
    const queue = await database.get<{ id: number }>(`SELECT id FROM queues WHERE name = 'Geral'`);

    // Criar ticket simples
    const result = await database.run(
      `INSERT INTO tickets (customer_phone, problem, status, queue_id, bot_data)
       VALUES (?, ?, 'waiting', ?, ?)`,
      [phone, reason, queue?.id || null, JSON.stringify({ reason, ...session.data })]
    );

    session.ticketId = result.lastID;
    session.step = 'aguardando';
    sessions.set(phone, session);

    await this.sendBotMessage(phone,
      `🔔 *Transferindo para atendimento humano...*

Seu chamado #${result.lastID} foi criado e um técnico irá atendê-lo em breve.

_Aguarde..._`
    );

    if (this.io) {
      this.io.emit('ticket:new', { id: result.lastID, customer_phone: phone, status: 'waiting' });
    }
  }

  /**
   * Envia mensagem do bot
   */
  private async sendBotMessage(phone: string, text: string): Promise<void> {
    try {
      await whatsappService.sendMessage(phone, text);

      // Salvar mensagem se tiver ticket
      const session = sessions.get(phone);
      if (session?.ticketId) {
        await this.saveMessage(session.ticketId, 'bot', null, '🤖 Bot', text, null);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem bot:', error);
    }
  }

  /**
   * Salva mensagem no banco
   */
  private async saveMessage(
    ticketId: number,
    senderType: string,
    senderId: number | null,
    senderName: string | null,
    content: string,
    waMessageId: string | null
  ): Promise<void> {
    await database.run(
      `INSERT INTO messages (ticket_id, sender_type, sender_id, sender_name, content, wa_message_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, senderType, senderId, senderName, content, waMessageId]
    );
  }

  /**
   * Emite nova mensagem via Socket.IO
   */
  private emitNewMessage(ticketId: number, message: any): void {
    if (this.io) {
      this.io.emit(`ticket:${ticketId}:message`, message);
    }
  }
}

export const chatbotService = new ChatbotService();
export default chatbotService;
