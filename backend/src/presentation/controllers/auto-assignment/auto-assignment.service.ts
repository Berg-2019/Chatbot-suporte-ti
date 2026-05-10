import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class AutoAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    let config = await this.prisma.autoAssignmentConfig.findFirst();
    if (!config) {
      config = await this.prisma.autoAssignmentConfig.create({
        data: {
          enabled: false,
          strategy: 'round_robin',
          respectSector: true,
          respectLevel: false,
        },
      });
    }
    return config;
  }

  async updateConfig(data: {
    enabled?: boolean;
    strategy?: string;
    applyToSectors?: string[];
    applyToPriorities?: string[];
    applyToCategories?: string[];
    respectSector?: boolean;
    respectLevel?: boolean;
    maxTicketsPerAgent?: number;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    workingDays?: string[];
  }) {
    let config = await this.prisma.autoAssignmentConfig.findFirst();
    if (!config) {
      config = await this.prisma.autoAssignmentConfig.create({
        data: {
          enabled: data.enabled ?? false,
          strategy: data.strategy ?? 'round_robin',
          applyToSectors: data.applyToSectors ?? [],
          applyToPriorities: data.applyToPriorities ?? [],
          applyToCategories: data.applyToCategories ?? [],
          respectSector: data.respectSector ?? true,
          respectLevel: data.respectLevel ?? false,
          maxTicketsPerAgent: data.maxTicketsPerAgent,
          workingHoursStart: data.workingHoursStart,
          workingHoursEnd: data.workingHoursEnd,
          workingDays: data.workingDays ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
        },
      });
    } else {
      config = await this.prisma.autoAssignmentConfig.update({
        where: { id: config.id },
        data,
      });
    }
    return config;
  }

  async getStats() {
    const technicians = await this.prisma.user.findMany({
      where: { active: true, receiveAlerts: true },
      select: {
        id: true,
        name: true,
        sector: true,
        technicianLevel: true,
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CLIENT'] } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const totalActiveTickets = technicians.reduce((sum, t) => sum + t._count.tickets, 0);
    const avgTicketsPerTechnician = technicians.length > 0 ? totalActiveTickets / technicians.length : 0;

    return {
      technicians: technicians.map((t) => ({
        id: t.id,
        name: t.name,
        sector: t.sector,
        level: t.technicianLevel,
        activeTickets: t._count.tickets,
        loadPercentage: avgTicketsPerTechnician > 0 ? (t._count.tickets / avgTicketsPerTechnician) * 100 : 0,
      })),
      summary: {
        totalTechnicians: technicians.length,
        totalActiveTickets,
        avgTicketsPerTechnician: Math.round(avgTicketsPerTechnician * 10) / 10,
        mostBusy: technicians.reduce((prev, current) =>
          (current._count.tickets > prev._count.tickets ? current : prev), technicians[0] || null
        )?.name,
        leastBusy: technicians.reduce((prev, current) =>
          (current._count.tickets < prev._count.tickets ? current : prev), technicians[0] || null
        )?.name,
      },
    };
  }

  async toggle() {
    let config = await this.prisma.autoAssignmentConfig.findFirst();
    if (!config) {
      config = await this.prisma.autoAssignmentConfig.create({
        data: { enabled: true, strategy: 'round_robin', respectSector: true },
      });
    } else {
      config = await this.prisma.autoAssignmentConfig.update({
        where: { id: config.id },
        data: { enabled: !config.enabled },
      });
    }
    return { enabled: config.enabled, message: config.enabled ? 'Auto-assignment ativado' : 'Auto-assignment desativado' };
  }
}
