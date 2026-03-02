/**
 * CSAT Service - Customer Satisfaction
 * Gerencia pesquisas de satisfação após fechamento de tickets
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AutomationEngineService } from './automation-engine.service';

interface SendCsatDto {
  ticketId: string;
  channel: 'whatsapp' | 'web' | 'email';
}

interface SubmitCsatDto {
  ticketId: string;
  rating: number; // 1-5
  feedback?: string;
}

export interface CsatStats {
  totalResponses: number;
  averageRating: number;
  distribution: {
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  };
  responseRate: number; // % de tickets que responderam
}

@Injectable()
export class CsatService {
  private readonly logger = new Logger(CsatService.name);

  constructor(
    private prisma: PrismaService,
    private automationEngine: AutomationEngineService,
  ) { }

  /**
   * Envia pesquisa CSAT para um ticket
   * Chamado automaticamente quando ticket é fechado
   */
  async sendCsat(dto: SendCsatDto) {
    this.logger.log(`Sending CSAT for ticket ${dto.ticketId}`);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
      include: { assignedTo: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    // Verificar se já foi enviado
    const existing = await this.prisma.csatResponse.findUnique({
      where: { ticketId: dto.ticketId },
    });

    if (existing) {
      this.logger.warn(`CSAT already sent for ticket ${dto.ticketId}`);
      return { alreadySent: true, csat: existing };
    }

    // Criar registro de CSAT pendente
    const csat = await this.prisma.csatResponse.create({
      data: {
        ticketId: dto.ticketId,
        assignedToId: ticket.assignedToId,
        sentAt: new Date(),
        channel: dto.channel,
        rating: 0, // Ainda não respondido
      },
    });

    this.logger.log(`✅ CSAT sent for ticket ${dto.ticketId}`);

    // TODO: Enviar mensagem via WhatsApp/Email/Web
    // Será implementado na integração com bot

    return {
      success: true,
      csat,
      message: this.getCsatMessage(ticket.customerName || 'Cliente'),
    };
  }

  /**
   * Submete resposta do cliente
   */
  async submitCsat(dto: SubmitCsatDto) {
    this.logger.log(`Submitting CSAT for ticket ${dto.ticketId}: ${dto.rating}/5`);

    // Validar rating
    if (dto.rating < 1 || dto.rating > 5) {
      throw new Error('Rating deve ser entre 1 e 5');
    }

    const csat = await this.prisma.csatResponse.findUnique({
      where: { ticketId: dto.ticketId },
    });

    if (!csat) {
      throw new NotFoundException('Pesquisa CSAT não encontrada');
    }

    // Atualizar com resposta
    const updated = await this.prisma.csatResponse.update({
      where: { ticketId: dto.ticketId },
      data: {
        rating: dto.rating,
        feedback: dto.feedback,
        respondedAt: new Date(),
      },
      include: {
        ticket: true,
        assignedTo: true,
      },
    });

    this.logger.log(`✅ CSAT submitted: ${dto.rating}/5 stars`);

    // 🤖 Trigger automation: csat_received
    await this.automationEngine.processEvent('csat_received', {
      ticketId: dto.ticketId,
      csatId: updated.id,
      rating: dto.rating,
      feedback: dto.feedback,
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedTo?.name,
      ticket: updated.ticket,
    });

    return updated;
  }

  /**
   * Buscar CSAT de um ticket
   */
  async findByTicket(ticketId: string) {
    return this.prisma.csatResponse.findUnique({
      where: { ticketId },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            customerName: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Listar CSATs com filtros
   */
  async findAll(filters?: {
    assignedToId?: string;
    rating?: number;
    startDate?: Date;
    endDate?: Date;
    hasResponse?: boolean;
  }) {
    const where: any = {};

    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.rating) where.rating = filters.rating;
    if (filters?.hasResponse !== undefined) {
      where.rating = filters.hasResponse ? { gt: 0 } : 0;
    }

    if (filters?.startDate || filters?.endDate) {
      where.respondedAt = {};
      if (filters.startDate) where.respondedAt.gte = filters.startDate;
      if (filters.endDate) where.respondedAt.lte = filters.endDate;
    }

    return this.prisma.csatResponse.findMany({
      where,
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            customerName: true,
            status: true,
            createdAt: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { respondedAt: 'desc' },
    });
  }

  /**
   * Estatísticas gerais de CSAT
   */
  async getStats(filters?: {
    assignedToId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<CsatStats> {
    const where: any = { rating: { gt: 0 } }; // Apenas respondidos

    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.startDate || filters?.endDate) {
      where.respondedAt = {};
      if (filters.startDate) where.respondedAt.gte = filters.startDate;
      if (filters.endDate) where.respondedAt.lte = filters.endDate;
    }

    const [responses, distribution, totalSent] = await Promise.all([
      // Total de respostas
      this.prisma.csatResponse.count({ where }),

      // Distribuição por rating
      this.prisma.csatResponse.groupBy({
        by: ['rating'],
        where,
        _count: true,
      }),

      // Total de CSATs enviados
      this.prisma.csatResponse.count({
        where: {
          ...where,
          rating: undefined, // Remover filtro de rating respondido
        },
      }),
    ]);

    // Calcular média
    const allResponses = await this.prisma.csatResponse.findMany({
      where,
      select: { rating: true },
    });

    const averageRating =
      allResponses.length > 0
        ? allResponses.reduce((sum, r) => sum + r.rating, 0) / allResponses.length
        : 0;

    // Montar distribuição
    const dist = {
      rating1: 0,
      rating2: 0,
      rating3: 0,
      rating4: 0,
      rating5: 0,
    };

    distribution.forEach((d) => {
      const key = `rating${d.rating}` as keyof typeof dist;
      dist[key] = d._count;
    });

    return {
      totalResponses: responses,
      averageRating: Math.round(averageRating * 100) / 100,
      distribution: dist,
      responseRate: totalSent > 0 ? Math.round((responses / totalSent) * 100) : 0,
    };
  }

  /**
   * Estatísticas por técnico
   */
  async getStatsByTechnician(startDate?: Date, endDate?: Date) {
    const where: any = { rating: { gt: 0 }, assignedToId: { not: null } };

    if (startDate || endDate) {
      where.respondedAt = {};
      if (startDate) where.respondedAt.gte = startDate;
      if (endDate) where.respondedAt.lte = endDate;
    }

    const responses = await this.prisma.csatResponse.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Agrupar por técnico
    const byTechnician = responses.reduce((acc, r) => {
      if (!r.assignedTo) return acc;

      const techId = r.assignedTo.id;
      if (!acc[techId]) {
        acc[techId] = {
          technician: r.assignedTo,
          ratings: [],
          totalResponses: 0,
          averageRating: 0,
        };
      }

      acc[techId].ratings.push(r.rating);
      acc[techId].totalResponses++;

      return acc;
    }, {} as Record<string, any>);

    // Calcular médias
    Object.values(byTechnician).forEach((tech: any) => {
      const sum = tech.ratings.reduce((a: number, b: number) => a + b, 0);
      tech.averageRating = Math.round((sum / tech.ratings.length) * 100) / 100;
      delete tech.ratings; // Remover array de ratings
    });

    return Object.values(byTechnician);
  }

  /**
   * Adicionar nota de revisão (admin/supervisor)
   */
  async addReviewNote(ticketId: string, note: string, reviewedBy: string) {
    return this.prisma.csatResponse.update({
      where: { ticketId },
      data: {
        reviewNote: note,
        reviewedBy,
      },
    });
  }

  /**
   * Mensagem CSAT padrão
   */
  private getCsatMessage(customerName: string): string {
    return `Olá ${customerName}! 😊

Seu atendimento foi finalizado. Por favor, avalie nosso serviço:

😡 1 - Muito insatisfeito
😕 2 - Insatisfeito
😐 3 - Neutro
🙂 4 - Satisfeito
😍 5 - Muito satisfeito

Responda com o número de 1 a 5.

Você também pode deixar um comentário (opcional).`;
  }
}
