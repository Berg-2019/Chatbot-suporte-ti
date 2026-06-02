import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';
import { IntentService, Intent } from '../../presentation/controllers/intent/intent.service';
import { FaqService } from '../../presentation/controllers/faq/faq.service';
import { BaileysService } from './baileys.service';
import { FlowState, ConversationSession } from './whatsapp.types';
import { MESSAGES, SESSION_TTL, SESSION_PREFIX } from './whatsapp.constants';
import { Sector, TicketStatus } from '@prisma/client';

@Injectable()
export class FlowService implements OnModuleInit {
  private readonly logger = new Logger(FlowService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private intent: IntentService,
    private faq: FaqService,
    private baileys: BaileysService,
  ) {}

  onModuleInit() {
    this.baileys.onMessage(async (from, text, msg) => {
      await this.handleMessage(from, text);
    });
    this.logger.log('FlowService registrado como handler de mensagens');
  }

  async handleMessage(from: string, text: string) {
    const phone = from.split('@')[0];
    const normalized = text.trim();

    let session = await this.getSession(phone);

    if (!session || session.state === FlowState.IDLE) {
      session = this.newSession();

      const classification = await this.intent.classify(normalized, phone);
      this.logger.debug(`Intent: ${classification.intent} (${classification.confidence})`);

      await this.routeByIntent(from, phone, normalized, session, classification);
      return;
    }

    switch (session.state) {
      case FlowState.GREETING:
        await this.handleGreeting(from, phone, normalized, session);
        break;
      case FlowState.COLLECT_SECTOR:
        await this.handleCollectSector(from, phone, normalized, session);
        break;
      case FlowState.COLLECT_PROBLEM:
        await this.handleCollectProblem(from, phone, normalized, session);
        break;
      case FlowState.COLLECT_LOCATION:
        await this.handleCollectLocation(from, phone, normalized, session);
        break;
      case FlowState.CHECK_FAQ:
        await this.handleCheckFaq(from, phone, normalized, session);
        break;
      case FlowState.CONFIRM_TICKET:
        await this.handleConfirmTicket(from, phone, normalized, session);
        break;
      case FlowState.WAITING_AGENT:
        await this.handleWaitingAgent(from, phone, normalized, session);
        break;
      case FlowState.CONSULT_STATUS:
        await this.handleConsultStatus(from, phone, normalized, session);
        break;
      case FlowState.RATING:
        await this.handleRating(from, phone, normalized, session);
        break;
      default:
        session = this.newSession();
        await this.saveSession(phone, session);
        await this.send(from, MESSAGES.greeting);
    }
  }

  private async routeByIntent(
    from: string,
    phone: string,
    text: string,
    session: ConversationSession,
    classification: { intent: string; confidence: number },
  ) {
    const { intent, confidence } = classification;
    session.data.messageHistory.push({ role: 'user', content: text });

    switch (intent) {
      case Intent.OPEN_TICKET_IT:
        session.data.sector = 'TI' as Sector;
        session.state = FlowState.COLLECT_PROBLEM;
        await this.saveSession(phone, session);
        await this.send(from, MESSAGES.askProblem);
        break;

      case Intent.OPEN_TICKET_ELECTRIC:
        session.data.sector = 'ELECTRIC' as Sector;
        session.state = FlowState.COLLECT_PROBLEM;
        await this.saveSession(phone, session);
        await this.send(from, MESSAGES.askProblem);
        break;

      case Intent.CONSULT_TICKET:
        session.state = FlowState.CONSULT_STATUS;
        await this.saveSession(phone, session);
        await this.handleConsultStatus(from, phone, text, session);
        break;

      case Intent.CONSULT_FAQ:
        session.state = FlowState.CHECK_FAQ;
        await this.saveSession(phone, session);
        await this.searchAndShowFaq(from, phone, text, session);
        break;

      case Intent.SPEAK_WITH_TECHNICIAN:
        await this.escalateToAgent(from, phone, session);
        break;

      case Intent.GREETING:
        session.state = FlowState.GREETING;
        await this.saveSession(phone, session);
        await this.send(from, MESSAGES.greeting);
        break;

      case Intent.RATING:
        await this.startRatingFlow(from, phone, session);
        break;

      default:
        if (confidence >= 0.6 && text.length > 10) {
          session.data.sector = 'TI' as Sector;
          session.data.problem = text;
          session.state = FlowState.COLLECT_LOCATION;
          await this.saveSession(phone, session);
          await this.send(from, MESSAGES.askLocation);
        } else {
          session.state = FlowState.GREETING;
          await this.saveSession(phone, session);
          await this.send(from, MESSAGES.greeting);
        }
    }
  }

  private async handleGreeting(from: string, phone: string, text: string, session: ConversationSession) {
    const classification = await this.intent.classify(text, phone);
    await this.routeByIntent(from, phone, text, session, classification);
  }

  private async handleCollectSector(from: string, phone: string, text: string, session: ConversationSession) {
    const lower = text.toLowerCase();
    if (lower.includes('ti') || lower.includes('tecnologia') || lower.includes('computador') || lower.includes('sistema')) {
      session.data.sector = 'TI' as Sector;
    } else if (lower.includes('elétric') || lower.includes('eletric') || lower.includes('luz') || lower.includes('energia')) {
      session.data.sector = 'ELECTRIC' as Sector;
    } else {
      await this.send(from, 'Qual setor? Responda *TI* ou *Elétrica*.');
      return;
    }
    session.state = FlowState.COLLECT_PROBLEM;
    await this.saveSession(phone, session);
    await this.send(from, MESSAGES.askProblem);
  }

  private async handleCollectProblem(from: string, phone: string, text: string, session: ConversationSession) {
    session.data.problem = text;

    try {
      const faqs = await this.faq.search(text);
      if (faqs && faqs.length > 0) {
        session.data.foundFaqs = faqs.slice(0, 3).map((f: any) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        }));
        session.state = FlowState.CHECK_FAQ;
        await this.saveSession(phone, session);

        let msg = `💡 Encontrei soluções que podem ajudar:\n\n`;
        session.data.foundFaqs.forEach((f, i) => {
          msg += `*${i + 1}.* ${f.question}\n`;
        });
        msg += `\nResponda com o *número* para ver a solução ou *0* para abrir chamado.`;
        await this.send(from, msg);
        return;
      }
    } catch { /* FAQ search failed — continue */ }

    session.state = FlowState.COLLECT_LOCATION;
    await this.saveSession(phone, session);
    await this.send(from, MESSAGES.askLocation);
  }

  private async handleCollectLocation(from: string, phone: string, text: string, session: ConversationSession) {
    session.data.location = text;
    session.state = FlowState.CONFIRM_TICKET;
    await this.saveSession(phone, session);
    await this.send(from, MESSAGES.confirmTicket({
      sector: session.data.sector || 'TI',
      problem: session.data.problem || '',
      location: session.data.location || '',
    }));
  }

  private async handleCheckFaq(from: string, phone: string, text: string, session: ConversationSession) {
    const faqs = session.data.foundFaqs || [];
    const choice = parseInt(text);

    if (choice === 0 || text.toLowerCase() === 'não' || text.toLowerCase() === 'nao' || text.toLowerCase() === 'continuar') {
      session.state = FlowState.COLLECT_LOCATION;
      delete session.data.foundFaqs;
      await this.saveSession(phone, session);
      await this.send(from, MESSAGES.askLocation);
      return;
    }

    if (choice >= 1 && choice <= faqs.length) {
      const selected = faqs[choice - 1];
      await this.send(from, `📖 *${selected.question}*\n\n${selected.answer}\n\n---\nIsso resolveu? Responda *sim* ou *não*.`);
      return;
    }

    if (['sim', 's', 'yes'].includes(text.toLowerCase())) {
      await this.send(from, `Que bom que ajudou! 😊 Se precisar de algo mais, é só chamar.`);
      await this.clearSession(phone);
      return;
    }

    if (['não', 'nao', 'n', 'no'].includes(text.toLowerCase())) {
      session.state = FlowState.COLLECT_LOCATION;
      delete session.data.foundFaqs;
      await this.saveSession(phone, session);
      await this.send(from, MESSAGES.askLocation);
      return;
    }

    await this.send(from, `Responda com um número (1-${faqs.length}), *0* para abrir chamado, ou *sim/não*.`);
  }

  private async handleConfirmTicket(from: string, phone: string, text: string, session: ConversationSession) {
    const lower = text.toLowerCase();

    if (['sim', 's', 'yes', 'confirmar', 'confirmo'].includes(lower)) {
      try {
        const ticket = await this.prisma.ticket.create({
          data: {
            title: `[${session.data.sector}] ${(session.data.problem || '').substring(0, 60)}`,
            description: session.data.problem || '',
            phoneNumber: phone,
            customerName: session.data.customerName || phone,
            sector: (session.data.sector as Sector) || 'TI',
            status: 'NEW',
            priority: 'NORMAL',
            category: 'Incidente',
            location: session.data.location || null,
          },
        });

        const ticketNumber = ticket.id.slice(0, 8).toUpperCase();
        session.data.ticketId = ticket.id;
        session.state = FlowState.WAITING_AGENT;
        await this.saveSession(phone, session);

        await this.send(from, MESSAGES.ticketCreated(ticketNumber));
        this.logger.log(`🎫 Ticket criado: ${ticketNumber} (${phone})`);
      } catch (err: any) {
        this.logger.error(`Erro ao criar ticket: ${err.message}`);
        await this.send(from, MESSAGES.error);
        await this.clearSession(phone);
      }
      return;
    }

    if (['nao', 'não', 'n', 'no', 'cancelar'].includes(lower)) {
      await this.send(from, MESSAGES.cancelledTicket);
      await this.clearSession(phone);
      return;
    }

    await this.send(from, 'Responda *sim* para confirmar ou *não* para cancelar.');
  }

  private async handleWaitingAgent(from: string, phone: string, text: string, session: ConversationSession) {
    if (session.data.ticketId) {
      try {
        await this.prisma.message.create({
          data: {
            ticketId: session.data.ticketId,
            content: text,
            type: 'TEXT',
            direction: 'INCOMING',
          },
        });
      } catch { /* non-critical */ }
    }
  }

  private async handleConsultStatus(from: string, phone: string, text: string, session: ConversationSession) {
    try {
      const tickets = await this.prisma.ticket.findMany({
        where: {
          phoneNumber: { contains: phone },
          status: { notIn: ['CLOSED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { assignedTo: { select: { name: true } } },
      });

      if (tickets.length === 0) {
        await this.send(from, MESSAGES.ticketNotFound);
        await this.clearSession(phone);
        return;
      }

      let msg = `📋 Seus chamados:\n\n`;
      for (const t of tickets) {
        const number = t.id.slice(0, 8).toUpperCase();
        const statusLabel = this.statusLabel(t.status);
        const tech = (t as any).assignedTo?.name || 'Aguardando técnico';
        msg += `*#${number}* — ${statusLabel}\n  ${t.title}\n  Técnico: ${tech}\n\n`;
      }
      msg += `Se precisar de mais ajuda, descreva seu problema.`;

      await this.send(from, msg);
      await this.clearSession(phone);
    } catch (err: any) {
      this.logger.error(`Erro ao consultar tickets: ${err.message}`);
      await this.send(from, MESSAGES.error);
      await this.clearSession(phone);
    }
  }

  private async handleRating(from: string, phone: string, text: string, session: ConversationSession) {
    const score = parseInt(text);
    if (isNaN(score) || score < 1 || score > 5) {
      await this.send(from, 'Responda com uma nota de *1* a *5*.');
      return;
    }

    try {
      if (session.data.ticketId) {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: session.data.ticketId },
          select: { assignedToId: true },
        });
        await this.prisma.csatResponse.create({
          data: {
            ticketId: session.data.ticketId,
            rating: score,
            channel: 'whatsapp',
            sentAt: new Date(),
            assignedToId: ticket?.assignedToId || null,
          },
        });
      }
      await this.send(from, MESSAGES.csatThanks(score));
      this.logger.log(`⭐ CSAT: ${score}/5 para ticket ${session.data.ticketId} (${phone})`);
    } catch (err: any) {
      this.logger.warn(`Erro ao salvar CSAT: ${err.message}`);
      await this.send(from, MESSAGES.csatThanks(score));
    }
    await this.clearSession(phone);
  }

  async sendCsatRequest(phone: string, ticketId: string) {
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    const ticketNumber = ticketId.slice(0, 8).toUpperCase();

    const session = this.newSession();
    session.state = FlowState.RATING;
    session.data.ticketId = ticketId;
    await this.saveSession(phone.split('@')[0], session);

    await this.send(jid, MESSAGES.csatRequest(ticketNumber));
  }

  private async escalateToAgent(from: string, phone: string, session: ConversationSession) {
    const activeTicket = await this.prisma.ticket.findFirst({
      where: {
        phoneNumber: { contains: phone },
        status: { notIn: ['CLOSED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeTicket) {
      session.data.ticketId = activeTicket.id;
      session.state = FlowState.WAITING_AGENT;
      await this.saveSession(phone, session);
    }

    await this.send(from, MESSAGES.transferToAgent);
    if (!activeTicket) {
      await this.clearSession(phone);
    }
  }

  private async startRatingFlow(from: string, phone: string, session: ConversationSession) {
    const lastClosed = await this.prisma.ticket.findFirst({
      where: {
        phoneNumber: { contains: phone },
        status: 'CLOSED',
      },
      orderBy: { closedAt: 'desc' },
    });

    if (!lastClosed) {
      await this.send(from, 'Não encontrei chamados finalizados recentes para avaliar.');
      await this.clearSession(phone);
      return;
    }

    session.state = FlowState.RATING;
    session.data.ticketId = lastClosed.id;
    await this.saveSession(phone, session);

    const ticketNumber = lastClosed.id.slice(0, 8).toUpperCase();
    await this.send(from, MESSAGES.csatRequest(ticketNumber));
  }

  private async searchAndShowFaq(from: string, phone: string, text: string, session: ConversationSession) {
    try {
      const faqs = await this.faq.search(text);
      if (faqs && faqs.length > 0) {
        session.data.foundFaqs = faqs.slice(0, 3).map((f: any) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        }));
        await this.saveSession(phone, session);

        let msg = `📚 Encontrei:\n\n`;
        session.data.foundFaqs.forEach((f, i) => {
          msg += `*${i + 1}.* ${f.question}\n`;
        });
        msg += `\nResponda com o *número* ou descreva seu problema para abrir chamado.`;
        await this.send(from, msg);
        return;
      }
    } catch { /* ignore */ }

    await this.send(from, 'Não encontrei artigos sobre isso. Descreva seu problema que abro um chamado.');
    session.state = FlowState.GREETING;
    await this.saveSession(phone, session);
  }

  private async send(jid: string, text: string) {
    await this.baileys.sendText(jid, text);
  }

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      NEW: '🆕 Novo',
      ASSIGNED: '👤 Atribuído',
      IN_PROGRESS: '🔧 Em andamento',
      WAITING_CLIENT: '⏳ Aguardando você',
      RESOLVED: '✅ Resolvido',
      CLOSED: '🔒 Fechado',
    };
    return map[status] || status;
  }

  private newSession(): ConversationSession {
    return {
      state: FlowState.IDLE,
      data: { messageHistory: [] },
      updatedAt: Date.now(),
    };
  }

  private async getSession(phone: string): Promise<ConversationSession | null> {
    const data = await this.redis.get(`${SESSION_PREFIX}${phone}`);
    return data ? JSON.parse(data) : null;
  }

  private async saveSession(phone: string, session: ConversationSession) {
    session.updatedAt = Date.now();
    await this.redis.set(`${SESSION_PREFIX}${phone}`, JSON.stringify(session), SESSION_TTL);
  }

  private async clearSession(phone: string) {
    await this.redis.del(`${SESSION_PREFIX}${phone}`);
  }
}
