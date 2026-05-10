/**
 * Auto-Assignment Controller
 * Gerencia configuração de auto-atribuição de tickets
 */

import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('auto-assignment')
@UseGuards(AuthGuard('jwt'))
export class AutoAssignmentController {
  constructor(private prisma: PrismaService) {}

  @Get('config')
  async getConfig() {
    let config = await this.prisma.autoAssignmentConfig.findFirst();

    // Se não existe configuração, criar uma padrão
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

  @Patch('config')
  async updateConfig(@Body() data: {
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
      // Criar se não existe
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
      // Atualizar existente
      config = await this.prisma.autoAssignmentConfig.update({
        where: { id: config.id },
        data,
      });
    }

    return config;
  }

  @Get('stats')
  async getStats() {
    // Estatísticas de técnicos e distribuição de tickets
    const technicians = await this.prisma.user.findMany({
      where: {
        active: true,
        receiveAlerts: true,
      },
      select: {
        id: true,
        name: true,
        sector: true,
        technicianLevel: true,
        _count: {
          select: {
            tickets: {
              where: {
                status: {
                  in: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CLIENT'],
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
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

  @Post('toggle')
  async toggle() {
    let config = await this.prisma.autoAssignmentConfig.findFirst();

    if (!config) {
      config = await this.prisma.autoAssignmentConfig.create({
        data: {
          enabled: true,
          strategy: 'round_robin',
          respectSector: true,
        },
      });
    } else {
      config = await this.prisma.autoAssignmentConfig.update({
        where: { id: config.id },
        data: {
          enabled: !config.enabled,
        },
      });
    }

    return {
      enabled: config.enabled,
      message: config.enabled ? 'Auto-assignment ativado' : 'Auto-assignment desativado',
    };
  }
}
