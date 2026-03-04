/**
 * Agent Performance Metrics Service
 * Calcula e armazena métricas de performance dos técnicos
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AgentMetricsService {
  private readonly logger = new Logger(AgentMetricsService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * Atualiza métricas de um agente para um dia específico
   * Chamado automaticamente quando eventos acontecem (ticket criado, resolvido, mensagem enviada)
   */
  async updateAgentMetrics(agentId: string, date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar todos os tickets do agente no dia
    const tickets = await this.prisma.ticket.findMany({
      where: {
        assignedToId: agentId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          where: {
            direction: { in: ['OUTGOING', 'INCOMING'] },
          },
        },
        csatResponse: true,
      },
    });

    // Calcular métricas
    const ticketsCreated = tickets.length;
    const ticketsResolved = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    const ticketsInProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;

    let totalFirstResponseTime = 0;
    let firstResponseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;

    // Calcular tempos de primeira resposta e resolução
    for (const ticket of tickets) {
      // Primeira resposta: tempo entre criação e primeira mensagem OUTGOING
      const firstOutgoingMessage = ticket.messages.find((m) => m.direction === 'OUTGOING');
      if (firstOutgoingMessage) {
        const responseTime = Math.floor(
          (firstOutgoingMessage.createdAt.getTime() - ticket.createdAt.getTime()) / 1000,
        );
        totalFirstResponseTime += responseTime;
        firstResponseCount++;
      }

      // Tempo de resolução: tempo entre criação e resolução
      if (ticket.closedAt) {
        const resolutionTime = Math.floor((ticket.closedAt.getTime() - ticket.createdAt.getTime()) / 1000);
        totalResolutionTime += resolutionTime;
        resolutionCount++;
      }
    }

    // CSAT
    const csatResponses = tickets.map((t) => t.csatResponse).filter(Boolean);
    const csatSum = csatResponses.reduce((sum, csat) => sum + (csat?.rating || 0), 0);
    const csatCount = csatResponses.length;

    // Upsert (criar ou atualizar) métrica do dia
    const metric = await this.prisma.agentMetric.upsert({
      where: {
        agentId_date: {
          agentId,
          date: startOfDay,
        },
      },
      create: {
        agentId,
        date: startOfDay,
        ticketsCreated,
        ticketsResolved,
        ticketsInProgress,
        totalFirstResponseTime,
        firstResponseCount,
        totalResolutionTime,
        resolutionCount,
        csatSum,
        csatCount,
      },
      update: {
        ticketsCreated,
        ticketsResolved,
        ticketsInProgress,
        totalFirstResponseTime,
        firstResponseCount,
        totalResolutionTime,
        resolutionCount,
        csatSum,
        csatCount,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`✅ Métricas atualizadas para agente ${agentId} (${date.toISOString().split('T')[0]})`);

    return this.enrichMetric(metric);
  }

  /**
   * Enriquece métrica com campos calculados (médias)
   */
  private enrichMetric(metric: any) {
    return {
      ...metric,
      avgFirstResponseTime: metric.firstResponseCount > 0 ? metric.totalFirstResponseTime / metric.firstResponseCount : null,
      avgResolutionTime: metric.resolutionCount > 0 ? metric.totalResolutionTime / metric.resolutionCount : null,
      avgCsat: metric.csatCount > 0 ? metric.csatSum / metric.csatCount : null,
    };
  }

  /**
   * Busca métricas de um agente em um período
   */
  async getAgentMetrics(agentId: string, startDate: Date | string, endDate: Date | string) {
    const start = startDate && new Date(startDate).getTime() ? new Date(startDate) : new Date(0);
    const end = endDate && new Date(endDate).getTime() ? new Date(endDate) : new Date();

    const metrics = await this.prisma.agentMetric.findMany({
      where: {
        agentId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    return metrics.map(this.enrichMetric);
  }

  /**
   * Retorna métricas agregadas de todos os agentes em um período
   */
  async getAllAgentsMetrics(startDate: Date | string, endDate: Date | string) {
    const start = startDate && new Date(startDate).getTime() ? new Date(startDate) : new Date(0);
    const end = endDate && new Date(endDate).getTime() ? new Date(endDate) : new Date();

    const metrics = await this.prisma.agentMetric.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            technicianLevel: true,
          },
        },
      },
    });

    // Agrupar por agente
    const grouped = new Map<string, any>();

    for (const metric of metrics) {
      if (!grouped.has(metric.agentId)) {
        grouped.set(metric.agentId, {
          agent: metric.agent,
          metrics: {
            ticketsCreated: 0,
            ticketsResolved: 0,
            ticketsInProgress: 0,
            totalFirstResponseTime: 0,
            firstResponseCount: 0,
            totalResolutionTime: 0,
            resolutionCount: 0,
            csatSum: 0,
            csatCount: 0,
          },
        });
      }

      const agentData = grouped.get(metric.agentId)!;
      agentData.metrics.ticketsCreated += metric.ticketsCreated;
      agentData.metrics.ticketsResolved += metric.ticketsResolved;
      agentData.metrics.ticketsInProgress += metric.ticketsInProgress;
      agentData.metrics.totalFirstResponseTime += metric.totalFirstResponseTime;
      agentData.metrics.firstResponseCount += metric.firstResponseCount;
      agentData.metrics.totalResolutionTime += metric.totalResolutionTime;
      agentData.metrics.resolutionCount += metric.resolutionCount;
      agentData.metrics.csatSum += metric.csatSum;
      agentData.metrics.csatCount += metric.csatCount;
    }

    // Calcular médias
    const result = Array.from(grouped.values()).map((item) => ({
      agent: item.agent,
      ...item.metrics,
      avgFirstResponseTime:
        item.metrics.firstResponseCount > 0 ? item.metrics.totalFirstResponseTime / item.metrics.firstResponseCount : null,
      avgResolutionTime: item.metrics.resolutionCount > 0 ? item.metrics.totalResolutionTime / item.metrics.resolutionCount : null,
      avgCsat: item.metrics.csatCount > 0 ? item.metrics.csatSum / item.metrics.csatCount : null,
      resolutionRate:
        item.metrics.ticketsCreated > 0 ? (item.metrics.ticketsResolved / item.metrics.ticketsCreated) * 100 : 0,
    }));

    // Ordenar por tickets resolvidos (descendente)
    return result.sort((a, b) => b.ticketsResolved - a.ticketsResolved);
  }

  /**
   * Retorna ranking de agentes por métrica específica
   */
  async getRanking(metric: 'resolved' | 'csat' | 'response_time', period: { start: Date | string; end: Date | string }) {
    const allMetrics = await this.getAllAgentsMetrics(period.start, period.end);

    let sorted: any[];

    switch (metric) {
      case 'resolved':
        sorted = allMetrics.sort((a, b) => b.ticketsResolved - a.ticketsResolved);
        break;
      case 'csat':
        sorted = allMetrics.sort((a, b) => (b.avgCsat || 0) - (a.avgCsat || 0));
        break;
      case 'response_time':
        sorted = allMetrics
          .filter((a) => a.avgFirstResponseTime !== null)
          .sort((a, b) => (a.avgFirstResponseTime || Infinity) - (b.avgFirstResponseTime || Infinity));
        break;
      default:
        sorted = allMetrics;
    }

    return sorted.slice(0, 10); // Top 10
  }

  /**
   * Cron job: Atualiza métricas de todos os agentes diariamente à meia-noite
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateAllAgentMetricsDaily() {
    this.logger.log('🔄 Atualizando métricas diárias de todos os agentes...');

    const agents = await this.prisma.user.findMany({
      where: {
        role: { in: ['AGENT', 'ADMIN'] },
        active: true,
      },
      select: { id: true },
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (const agent of agents) {
      try {
        await this.updateAgentMetrics(agent.id, yesterday);
      } catch (error: any) {
        this.logger.error(`Erro ao atualizar métricas do agente ${agent.id}: ${error.message}`);
      }
    }

    this.logger.log(`✅ Métricas de ${agents.length} agentes atualizadas`);
  }
}
