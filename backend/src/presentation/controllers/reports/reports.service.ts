/**
 * Reports Service - Relatórios detalhados de Tickets e Estoque
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Relatório detalhado de tickets fechados
     */
    async getTicketClosureReport(filters: {
        startDate?: string;
        endDate?: string;
        technicianId?: string;
        category?: string;
        solutionType?: string;
    }) {
        const where: any = {
            status: { in: ['RESOLVED', 'CLOSED'] },
            closedAt: { not: null },
        };

        if (filters.startDate || filters.endDate) {
            where.closedAt = {};
            if (filters.startDate) where.closedAt.gte = new Date(filters.startDate);
            if (filters.endDate) where.closedAt.lte = new Date(filters.endDate);
        }

        if (filters.technicianId) {
            where.assignedToId = filters.technicianId;
        }

        if (filters.category) {
            where.category = filters.category;
        }

        if (filters.solutionType) {
            where.solutionType = filters.solutionType;
        }

        // Buscar tickets com dados de fechamento
        const tickets = await this.prisma.ticket.findMany({
            where,
            select: {
                id: true,
                title: true,
                category: true,
                priority: true,
                status: true,
                customerName: true,
                sector: true,
                solution: true,
                solutionType: true,
                timeWorked: true,
                rating: true,
                createdAt: true,
                closedAt: true,
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                partUsages: {
                    select: {
                        partName: true,
                        quantity: true,
                        unitCost: true,
                        purchased: true,
                    },
                },
            },
            orderBy: { closedAt: 'desc' },
        });

        // Aggregate stats
        const totalClosed = tickets.length;
        const totalTimeWorked = tickets.reduce((sum, t) => sum + (t.timeWorked || 0), 0);
        const avgTimeWorked = totalClosed > 0 ? Math.round(totalTimeWorked / totalClosed) : 0;

        const ratedTickets = tickets.filter(t => t.rating != null);
        const avgRating = ratedTickets.length > 0
            ? Number((ratedTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTickets.length).toFixed(1))
            : 0;

        // Tickets por técnico
        const byTechnician: Record<string, { name: string; count: number; avgTime: number }> = {};
        for (const t of tickets) {
            const techName = t.assignedTo?.name || 'Não atribuído';
            if (!byTechnician[techName]) {
                byTechnician[techName] = { name: techName, count: 0, avgTime: 0 };
            }
            byTechnician[techName].count++;
            byTechnician[techName].avgTime += t.timeWorked || 0;
        }
        for (const key of Object.keys(byTechnician)) {
            byTechnician[key].avgTime = Math.round(byTechnician[key].avgTime / byTechnician[key].count);
        }

        // Tickets por tipo de solução
        const bySolutionType: Record<string, number> = {};
        for (const t of tickets) {
            const st = t.solutionType || 'Não informado';
            bySolutionType[st] = (bySolutionType[st] || 0) + 1;
        }

        // Tickets por categoria
        const byCategory: Record<string, number> = {};
        for (const t of tickets) {
            const cat = t.category || 'Sem Categoria';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
        }

        // Tickets por dia (para gráfico)
        const byDay: Record<string, { total: number; date: string }> = {};
        for (const t of tickets) {
            if (t.closedAt) {
                const day = t.closedAt.toISOString().split('T')[0];
                if (!byDay[day]) byDay[day] = { total: 0, date: day };
                byDay[day].total++;
            }
        }

        return {
            tickets,
            summary: {
                totalClosed,
                totalTimeWorked,
                avgTimeWorked,
                avgRating,
                ratedCount: ratedTickets.length,
            },
            aggregates: {
                byTechnician: Object.values(byTechnician),
                bySolutionType: Object.entries(bySolutionType).map(([name, count]) => ({ name, count })),
                byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })),
                byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
            },
        };
    }

    /**
     * Relatório de movimentações de estoque
     */
    async getStockMovementReport(filters: {
        startDate?: string;
        endDate?: string;
        stockType?: string;
        category?: string;
        movementType?: string;
    }) {
        const where: any = {};

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
        }

        if (filters.movementType) {
            where.type = filters.movementType;
        }

        // Filter by stockItem properties
        if (filters.stockType || filters.category) {
            where.stockItem = {};
            if (filters.stockType) where.stockItem.stockType = filters.stockType;
            if (filters.category) where.stockItem.category = filters.category;
        }

        const movements = await this.prisma.stockMovement.findMany({
            where,
            include: {
                stockItem: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        stockType: true,
                        category: true,
                        unit: true,
                        location: true,
                        printerModel: true,
                        inkColor: true,
                        assetTag: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Aggregate stats
        const totalIn = movements
            .filter(m => m.type === 'IN')
            .reduce((sum, m) => sum + Number(m.quantity), 0);

        const totalOut = movements
            .filter(m => m.type === 'OUT')
            .reduce((sum, m) => sum + Number(m.quantity), 0);

        // By item
        const byItem: Record<string, { name: string; totalIn: number; totalOut: number; net: number }> = {};
        for (const m of movements) {
            const itemName = m.stockItem.name;
            if (!byItem[itemName]) {
                byItem[itemName] = { name: itemName, totalIn: 0, totalOut: 0, net: 0 };
            }
            if (m.type === 'IN') {
                byItem[itemName].totalIn += Number(m.quantity);
            } else {
                byItem[itemName].totalOut += Number(m.quantity);
            }
            byItem[itemName].net = byItem[itemName].totalIn - byItem[itemName].totalOut;
        }

        // By day (for chart)
        const byDay: Record<string, { date: string; totalIn: number; totalOut: number }> = {};
        for (const m of movements) {
            const day = m.createdAt.toISOString().split('T')[0];
            if (!byDay[day]) byDay[day] = { date: day, totalIn: 0, totalOut: 0 };
            if (m.type === 'IN') {
                byDay[day].totalIn += Number(m.quantity);
            } else {
                byDay[day].totalOut += Number(m.quantity);
            }
        }

        return {
            movements,
            summary: {
                totalMovements: movements.length,
                totalIn,
                totalOut,
                netBalance: totalIn - totalOut,
            },
            aggregates: {
                byItem: Object.values(byItem),
                byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
            },
        };
    }
}
