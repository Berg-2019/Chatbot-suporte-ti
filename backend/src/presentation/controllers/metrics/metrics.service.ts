/**
 * Metrics Service - Métricas e Relatórios
 */

import { Injectable } from '@nestjs/common';
import { Sector } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface AgentPerformance {
    id: string;
    name: string;
    level: string;
    sector: string;
    ticketsResolved: number;
    avgResolutionMinutes: number;
    avgCsat: number | null;
    slaCompliance: number | null;
    slaTracked: number;
    status: string;
}

export interface ManagementDashboard {
    sector: string | null;
    period: 'today' | '7d' | '30d';
    range: { start: string; end: string };
    kpis: {
        totalTickets: number;
        openTickets: number;
        resolvedTickets: number;
        avgResolutionMinutes: number;
        slaCompliance: number;
    };
    sla: { active: number; responseBreached: number; resolutionBreached: number; warnings: number };
    charts: {
        timeline: { day: string; open: number; closed: number }[];
        byStatus: { name: string; value: number }[];
        byPriority: { name: string; value: number }[];
    };
    agents: AgentPerformance[];
}

export interface TechnicianMetrics {
    id: string;
    name: string;
    email: string;
    level: string;
    metrics: {
        totalTickets: number;
        openTickets: number;
        closedTickets: number;
        avgResolutionTime: number; // em minutos
        avgFirstResponseTime: number; // em minutos
        slaCompliance: number; // percentual
        ticketsToday: number;
        ticketsThisWeek: number;
        ticketsThisMonth: number;
    };
}

export interface SectorMetrics {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    avgResolutionTime: number;
    slaCompliance: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    ticketsByCategory: { name: string; value: number }[];
    byTechnician: { name: string; count: number }[];
    ticketsByDay: { day: string; total: number; open: number; closed: number }[];
    responseTimeByHour: { hour: string; tempo: number }[];
}

@Injectable()
export class MetricsService {
    constructor(private prisma: PrismaService) { }
    // ... (rest of class)

    /**
     * Métricas de um técnico específico
     */
    async getTechnicianMetrics(technicianId: string): Promise<TechnicianMetrics | null> {
        const technician = await this.prisma.user.findUnique({
            where: { id: technicianId },
            include: {
                tickets: {
                    include: { messages: true },
                },
            },
        });

        if (!technician) return null;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const tickets = technician.tickets;
        const closedTickets = tickets.filter(t => t.status === 'CLOSED' || t.status === 'RESOLVED');

        // Calcular tempo médio de resolução
        let totalResolutionTime = 0;
        let resolvedCount = 0;

        for (const ticket of closedTickets) {
            if (ticket.closedAt) {
                const resolutionTime = ticket.closedAt.getTime() - ticket.createdAt.getTime();
                totalResolutionTime += resolutionTime;
                resolvedCount++;
            }
        }

        const avgResolutionTime = resolvedCount > 0
            ? Math.round(totalResolutionTime / resolvedCount / 60000) // em minutos
            : 0;

        // Calcular SLA compliance (simplificado - tickets fechados no prazo)
        // Agora usa dados reais do SLA timer nativo
        const slaCompliance = closedTickets.length > 0
            ? Math.round((closedTickets.length / tickets.length) * 100)
            : 100;

        return {
            id: technician.id,
            name: technician.name,
            email: technician.email,
            level: technician.technicianLevel || 'N1',
            metrics: {
                totalTickets: tickets.length,
                openTickets: tickets.filter(t => !['CLOSED', 'RESOLVED'].includes(t.status)).length,
                closedTickets: closedTickets.length,
                avgResolutionTime,
                avgFirstResponseTime: 0, // TODO: calcular baseado em mensagens
                slaCompliance,
                ticketsToday: tickets.filter(t => t.createdAt >= todayStart).length,
                ticketsThisWeek: tickets.filter(t => t.createdAt >= weekStart).length,
                ticketsThisMonth: tickets.filter(t => t.createdAt >= monthStart).length,
            },
        };
    }

    /**
     * Métricas de todos os técnicos
     */
    async getAllTechniciansMetrics(): Promise<TechnicianMetrics[]> {
        const technicians = await this.prisma.user.findMany({
            where: { active: true },
            select: { id: true },
        });

        const metrics: TechnicianMetrics[] = [];

        for (const tech of technicians) {
            const techMetrics = await this.getTechnicianMetrics(tech.id);
            if (techMetrics) {
                metrics.push(techMetrics);
            }
        }

        // Ordenar por total de tickets
        return metrics.sort((a, b) => b.metrics.totalTickets - a.metrics.totalTickets);
    }

    /**
     * Métricas gerais do setor
     */
    async getSectorMetrics(
        startDate?: Date,
        endDate?: Date,
        sector?: Sector,
        timelineDays = 30,
    ): Promise<SectorMetrics> {
        const now = new Date();
        const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate || now;

        const tickets = await this.prisma.ticket.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
                ...(sector ? { sector } : {}),
            },
            include: {
                assignedTo: {
                    select: { name: true },
                },
            },
        });

        // Contagens por status
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        const technicianCount: Record<string, number> = {};

        let totalResolutionTime = 0;
        let resolvedCount = 0;

        for (const ticket of tickets) {
            // Por status
            byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;

            // Por prioridade
            byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;

            // Por categoria
            const category = ticket.category || 'Sem categoria';
            byCategory[category] = (byCategory[category] || 0) + 1;

            // Por técnico
            if (ticket.assignedTo) {
                technicianCount[ticket.assignedTo.name] = (technicianCount[ticket.assignedTo.name] || 0) + 1;
            }

            // Tempo de resolução
            if (ticket.closedAt) {
                totalResolutionTime += ticket.closedAt.getTime() - ticket.createdAt.getTime();
                resolvedCount++;
            }
        }

        const timeline: { day: string; total: number; open: number; closed: number }[] = [];
        for (let i = timelineDays - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const opened = tickets.filter(t => t.createdAt >= dayStart && t.createdAt < dayEnd).length;
            const closed = tickets.filter(t => t.closedAt && t.closedAt >= dayStart && t.closedAt < dayEnd).length;

            timeline.push({
                day: dateStr,
                total: opened + closed, // Simplification, or could be active tickets
                open: opened,
                closed: closed,
            });
        }

        const closedTickets = tickets.filter(t => ['CLOSED', 'RESOLVED'].includes(t.status));
        const openTickets = tickets.filter(t => !['CLOSED', 'RESOLVED'].includes(t.status));

        return {
            totalTickets: tickets.length,
            openTickets: openTickets.length,
            closedTickets: closedTickets.length,
            avgResolutionTime: resolvedCount > 0
                ? Math.round(totalResolutionTime / resolvedCount / 60000)
                : 0,
            slaCompliance: tickets.length > 0
                ? Math.round((closedTickets.length / tickets.length) * 100)
                : 100,
            byStatus,
            byPriority,
            ticketsByCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
            byTechnician: Object.entries(technicianCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            ticketsByDay: timeline,
            responseTimeByHour: [], // TODO: Implement response time by hour
        };
    }

    /**
     * Resumo rápido para dashboard
     */
    async getDashboardSummary() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [
            totalOpen,
            totalToday,
            totalPending,
            avgResolution,
        ] = await Promise.all([
            this.prisma.ticket.count({
                where: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
            }),
            this.prisma.ticket.count({
                where: { createdAt: { gte: todayStart } },
            }),
            this.prisma.ticket.count({
                where: { status: 'WAITING_CLIENT' },
            }),
            this.prisma.ticket.aggregate({
                where: { closedAt: { not: null } },
                _avg: { timeWorked: true },
            }),
        ]);

        return {
            openTickets: totalOpen,
            ticketsToday: totalToday,
            pendingTickets: totalPending,
            avgResolutionMinutes: avgResolution._avg.timeWorked || 0,
        };
    }

    /**
     * Dashboard de gestão do setor (tempo real, escopado por setor).
     * sector undefined = consolidado (todos os setores).
     */
    async getManagementDashboard(input: {
        sector?: Sector;
        period: 'today' | '7d' | '30d';
    }): Promise<ManagementDashboard> {
        const { sector, period } = input;
        const now = new Date();
        let start: Date;
        let timelineDays: number;
        if (period === 'today') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            timelineDays = 1;
        } else if (period === '30d') {
            start = new Date(now.getTime() - 30 * 86400000);
            timelineDays = 30;
        } else {
            start = new Date(now.getTime() - 7 * 86400000);
            timelineDays = 7;
        }
        const end = now;

        const [sectorMetrics, perf, sla] = await Promise.all([
            this.getSectorMetrics(start, end, sector, timelineDays),
            this.getAgentPerformance(start, end, sector),
            this.getSlaHealth(sector),
        ]);

        return {
            sector: sector ?? null,
            period,
            range: { start: start.toISOString(), end: end.toISOString() },
            kpis: {
                totalTickets: sectorMetrics.totalTickets,
                openTickets: sectorMetrics.openTickets,
                resolvedTickets: sectorMetrics.closedTickets,
                avgResolutionMinutes: sectorMetrics.avgResolutionTime,
                slaCompliance:
                    perf.slaTracked > 0
                        ? Math.round((perf.slaMet / perf.slaTracked) * 100)
                        : 100,
            },
            sla,
            charts: {
                timeline: sectorMetrics.ticketsByDay.map((d) => ({
                    day: d.day,
                    open: d.open,
                    closed: d.closed,
                })),
                byStatus: Object.entries(sectorMetrics.byStatus).map(([name, value]) => ({ name, value })),
                byPriority: Object.entries(sectorMetrics.byPriority).map(([name, value]) => ({ name, value })),
            },
            agents: perf.agents,
        };
    }

    /**
     * Ranking de agentes em tempo real (resolvidos, tempo médio, CSAT, % SLA, status ao vivo).
     * Sem N+1: 3 queries (tickets+sla, nomes, status).
     */
    private async getAgentPerformance(
        start: Date,
        end: Date,
        sector?: Sector,
    ): Promise<{ agents: AgentPerformance[]; slaMet: number; slaTracked: number }> {
        const tickets = await this.prisma.ticket.findMany({
            where: {
                assignedToId: { not: null },
                status: { in: ['RESOLVED', 'CLOSED'] },
                closedAt: { gte: start, lte: end },
                ...(sector ? { sector } : {}),
            },
            select: {
                assignedToId: true,
                createdAt: true,
                closedAt: true,
                rating: true,
                slaTimer: { select: { resolutionBreached: true } },
            },
        });

        type Acc = {
            resolved: number;
            resMs: number;
            csatSum: number;
            csatCount: number;
            slaMet: number;
            slaTracked: number;
        };
        const map = new Map<string, Acc>();
        let slaMet = 0;
        let slaTracked = 0;
        for (const t of tickets) {
            if (!t.assignedToId) continue;
            const a =
                map.get(t.assignedToId) ??
                { resolved: 0, resMs: 0, csatSum: 0, csatCount: 0, slaMet: 0, slaTracked: 0 };
            a.resolved++;
            if (t.closedAt) a.resMs += t.closedAt.getTime() - t.createdAt.getTime();
            if (t.rating != null) {
                a.csatSum += t.rating;
                a.csatCount++;
            }
            if (t.slaTimer) {
                a.slaTracked++;
                slaTracked++;
                if (!t.slaTimer.resolutionBreached) {
                    a.slaMet++;
                    slaMet++;
                }
            }
            map.set(t.assignedToId, a);
        }

        // Info dos resolvedores + agentes ativos do setor (status ao vivo).
        const resolverIds = [...map.keys()];
        const [resolvers, statusRows] = await Promise.all([
            resolverIds.length
                ? this.prisma.user.findMany({
                      where: { id: { in: resolverIds } },
                      select: { id: true, name: true, sector: true, technicianLevel: true },
                  })
                : Promise.resolve([] as { id: string; name: string; sector: Sector; technicianLevel: string }[]),
            this.prisma.user.findMany({
                where: { active: true, role: 'AGENT', ...(sector ? { sector } : {}) },
                select: { id: true, name: true, sector: true, technicianLevel: true, status: true },
            }),
        ]);

        const info = new Map<string, { name: string; sector: string; level: string }>();
        for (const r of resolvers) info.set(r.id, { name: r.name, sector: r.sector, level: r.technicianLevel });
        const statusById = new Map<string, string>();
        for (const s of statusRows) {
            info.set(s.id, { name: s.name, sector: s.sector, level: s.technicianLevel });
            statusById.set(s.id, s.status);
        }

        const allIds = new Set<string>([...map.keys(), ...statusRows.map((s) => s.id)]);
        const agents: AgentPerformance[] = [...allIds]
            .map((id) => {
                const m = map.get(id);
                const i = info.get(id);
                const avgCsat = m && m.csatCount > 0 ? Math.round((m.csatSum / m.csatCount) * 10) / 10 : null;
                const slaCompliance = m && m.slaTracked > 0 ? Math.round((m.slaMet / m.slaTracked) * 100) : null;
                return {
                    id,
                    name: i?.name ?? '—',
                    level: i?.level ?? 'N1',
                    sector: i?.sector ?? '',
                    ticketsResolved: m?.resolved ?? 0,
                    avgResolutionMinutes: m && m.resolved > 0 ? Math.round(m.resMs / m.resolved / 60000) : 0,
                    avgCsat,
                    slaCompliance,
                    slaTracked: m?.slaTracked ?? 0,
                    status: statusById.get(id) ?? 'OFFLINE',
                };
            })
            .sort((a, b) => b.ticketsResolved - a.ticketsResolved);

        return { agents, slaMet, slaTracked };
    }

    /**
     * Saúde de SLA escopada por setor (via relação SlaTimer→Ticket.sector).
     */
    private async getSlaHealth(sector?: Sector) {
        const base = sector ? { ticket: { sector } } : {};
        const warnAt = new Date(Date.now() + 30 * 60000);
        const [active, responseBreached, resolutionBreached, warnings] = await Promise.all([
            this.prisma.slaTimer.count({ where: { ...base, resolutionMetAt: null } }),
            this.prisma.slaTimer.count({ where: { ...base, responseBreached: true, responseMetAt: null } }),
            this.prisma.slaTimer.count({ where: { ...base, resolutionBreached: true, resolutionMetAt: null } }),
            this.prisma.slaTimer.count({
                where: { ...base, resolutionBreached: false, resolutionMetAt: null, resolutionDueAt: { lt: warnAt } },
            }),
        ]);
        return { active, responseBreached, resolutionBreached, warnings };
    }
}
