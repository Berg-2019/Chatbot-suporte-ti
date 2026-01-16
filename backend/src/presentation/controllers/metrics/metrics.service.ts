/**
 * Metrics Service - Métricas e Relatórios
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

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
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        totalTickets: number;
        openTickets: number;
        closedTickets: number;
        avgResolutionTime: number;
        slaCompliance: number;
    };
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    byTechnician: { name: string; count: number }[];
    timeline: { date: string; opened: number; closed: number }[];
}

@Injectable()
export class MetricsService {
    constructor(private prisma: PrismaService) { }

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
        // TODO: Integrar com dados de SLA do GLPI
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
    async getSectorMetrics(startDate?: Date, endDate?: Date): Promise<SectorMetrics> {
        const now = new Date();
        const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate || now;

        const tickets = await this.prisma.ticket.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
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

        // Timeline (últimos 30 dias)
        const timeline: { date: string; opened: number; closed: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            timeline.push({
                date: dateStr,
                opened: tickets.filter(t => t.createdAt >= dayStart && t.createdAt < dayEnd).length,
                closed: tickets.filter(t => t.closedAt && t.closedAt >= dayStart && t.closedAt < dayEnd).length,
            });
        }

        const closedTickets = tickets.filter(t => ['CLOSED', 'RESOLVED'].includes(t.status));
        const openTickets = tickets.filter(t => !['CLOSED', 'RESOLVED'].includes(t.status));

        return {
            period: { start, end },
            summary: {
                totalTickets: tickets.length,
                openTickets: openTickets.length,
                closedTickets: closedTickets.length,
                avgResolutionTime: resolvedCount > 0
                    ? Math.round(totalResolutionTime / resolvedCount / 60000)
                    : 0,
                slaCompliance: tickets.length > 0
                    ? Math.round((closedTickets.length / tickets.length) * 100)
                    : 100,
            },
            byStatus,
            byPriority,
            byCategory,
            byTechnician: Object.entries(technicianCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            timeline,
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
}
