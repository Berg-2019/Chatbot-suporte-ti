import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Sector } from '@prisma/client';

export interface AgentReportData {
  agent: { id: string; name: string; level: string; sector: string | null };
  period: { start: Date; end: Date };
  volume: { resolved: number; created: number; inProgress: number };
  times: { avgResolutionMinutes: number; avgTimeWorkedMinutes: number };
  sla: { tracked: number; met: number; compliance: number | null; resolutionBreaches: number };
  csat: {
    count: number;
    average: number | null;
    distribution: Record<number, number>;
    comments: { rating: number; feedback: string; at: Date }[];
  };
  distribution: {
    byPriority: { name: string; value: number }[];
    byCategory: { name: string; value: number }[];
    byType: { name: string; value: number }[];
  };
}

interface Requester {
  role: string;
  sector?: Sector | string | null;
}

function tally(items: (string | null | undefined)[]): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const it of items) {
    const key = it || 'Sem categoria';
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Agrega o desempenho de um agente num período (tempo real, a partir de
 * Ticket / SlaTimer / CsatResponse). Setor validado contra o solicitante.
 */
@Injectable()
export class AgentReportService {
  constructor(private prisma: PrismaService) {}

  async getAgentReport(
    agentId: string,
    startDate: Date,
    endDate: Date,
    requester?: Requester,
  ): Promise<AgentReportData> {
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, technicianLevel: true, sector: true },
    });
    if (!agent) throw new NotFoundException('Agente não encontrado');

    // Anti-IDOR: admin de setor só acessa agentes do próprio setor.
    if (requester && requester.role !== 'ADMIN' && agent.sector !== requester.sector) {
      throw new ForbiddenException('Agente fora do seu setor');
    }

    const [resolvedTickets, created, inProgress, csatRows] = await Promise.all([
      this.prisma.ticket.findMany({
        where: {
          assignedToId: agentId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          closedAt: { gte: startDate, lte: endDate },
        },
        select: {
          priority: true,
          category: true,
          type: true,
          createdAt: true,
          closedAt: true,
          timeWorked: true,
          slaTimer: { select: { resolutionBreached: true } },
        },
      }),
      this.prisma.ticket.count({
        where: { assignedToId: agentId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.ticket.count({
        where: { assignedToId: agentId, status: 'IN_PROGRESS' },
      }),
      this.prisma.csatResponse.findMany({
        where: { assignedToId: agentId, respondedAt: { gte: startDate, lte: endDate } },
        select: { rating: true, feedback: true, respondedAt: true },
        orderBy: { respondedAt: 'desc' },
      }),
    ]);

    // Tempos
    let resMsSum = 0;
    let resCount = 0;
    let workedSum = 0;
    let workedCount = 0;
    // SLA
    let slaTracked = 0;
    let slaMet = 0;
    let slaBreaches = 0;
    for (const t of resolvedTickets) {
      if (t.closedAt && t.createdAt) {
        resMsSum += t.closedAt.getTime() - t.createdAt.getTime();
        resCount++;
      }
      if (t.timeWorked != null) {
        workedSum += t.timeWorked;
        workedCount++;
      }
      if (t.slaTimer) {
        slaTracked++;
        if (t.slaTimer.resolutionBreached) slaBreaches++;
        else slaMet++;
      }
    }

    // CSAT
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    for (const c of csatRows) {
      if (c.rating >= 1 && c.rating <= 5) distribution[c.rating]++;
      ratingSum += c.rating;
    }

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        level: agent.technicianLevel || 'N1',
        sector: agent.sector ?? null,
      },
      period: { start: startDate, end: endDate },
      volume: { resolved: resolvedTickets.length, created, inProgress },
      times: {
        avgResolutionMinutes: resCount > 0 ? Math.round(resMsSum / resCount / 60000) : 0,
        avgTimeWorkedMinutes: workedCount > 0 ? Math.round(workedSum / workedCount) : 0,
      },
      sla: {
        tracked: slaTracked,
        met: slaMet,
        compliance: slaTracked > 0 ? Math.round((slaMet / slaTracked) * 100) : null,
        resolutionBreaches: slaBreaches,
      },
      csat: {
        count: csatRows.length,
        average: csatRows.length > 0 ? Number((ratingSum / csatRows.length).toFixed(1)) : null,
        distribution,
        comments: csatRows
          .filter((c) => c.feedback && c.feedback.trim())
          .map((c) => ({ rating: c.rating, feedback: c.feedback as string, at: c.respondedAt })),
      },
      distribution: {
        byPriority: tally(resolvedTickets.map((t) => t.priority)),
        byCategory: tally(resolvedTickets.map((t) => t.category)),
        byType: tally(resolvedTickets.map((t) => t.type)),
      },
    };
  }

  /** Agentes ativos do setor (para o relatório consolidado). */
  async listAgents(sector?: Sector): Promise<{ id: string; name: string }[]> {
    return this.prisma.user.findMany({
      where: {
        active: true,
        role: 'AGENT',
        ...(sector ? { sector } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
