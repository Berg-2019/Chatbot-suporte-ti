import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class CsatService {
  private readonly logger = new Logger(CsatService.name);

  constructor(private prisma: PrismaService) {}

  async getSummary(periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const responses = await this.prisma.csatResponse.findMany({
      where: { respondedAt: { gte: since } },
      select: { rating: true },
    });

    const total = responses.length;
    if (total === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        periodDays,
      };
    }

    const sum = responses.reduce((acc, r) => acc + r.rating, 0);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of responses) {
      distribution[r.rating as keyof typeof distribution]++;
    }

    return {
      average: Math.round((sum / total) * 10) / 10,
      total,
      distribution,
      periodDays,
    };
  }

  async getRecent(limit = 20) {
    return this.prisma.csatResponse.findMany({
      orderBy: { respondedAt: 'desc' },
      take: limit,
      include: {
        ticket: { select: { id: true, title: true, sector: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async getAgentRanking(periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const agents = await this.prisma.$queryRaw<Array<{
      id: string;
      name: string;
      avg_rating: number;
      total_tickets: number;
      avg_resolution_seconds: number;
      total_csat: number;
    }>>`
      SELECT
        u.id,
        u.name,
        COALESCE(AVG(c.rating), 0)::float AS avg_rating,
        COUNT(DISTINCT t.id)::int AS total_tickets,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t."closedAt" - t."createdAt"))), 0)::float AS avg_resolution_seconds,
        COUNT(DISTINCT c.id)::int AS total_csat
      FROM users u
      INNER JOIN tickets t ON t."assignedToId" = u.id AND t.status = 'CLOSED' AND t."closedAt" >= ${since}
      LEFT JOIN csat_responses c ON c."ticketId" = t.id
      WHERE u.role IN ('AGENT', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
      GROUP BY u.id, u.name
      HAVING COUNT(DISTINCT t.id) > 0
      ORDER BY avg_rating DESC NULLS LAST, total_tickets DESC
    `;

    return agents.map((a, i) => ({
      rank: i + 1,
      id: a.id,
      name: a.name,
      avgRating: Math.round(a.avg_rating * 10) / 10,
      totalTickets: a.total_tickets,
      avgResolutionHours: Math.round(a.avg_resolution_seconds / 3600 * 10) / 10,
      totalCsat: a.total_csat,
    }));
  }
}
