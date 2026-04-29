import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SlaCalculatorService } from '../../../infrastructure/sla/sla-calculator.service';
import { Priority, Sector } from '@prisma/client';

@Injectable()
export class SlaService {
  constructor(
    private prisma: PrismaService,
    private calculator: SlaCalculatorService,
  ) {}

  async createTimerForTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return null;

    const sector = ticket.sector || 'TI';
    const priority = ticket.priority || 'NORMAL';

    const policy = await this.prisma.slaPolicy.findUnique({
      where: { sector_priority: { sector: sector as Sector, priority: priority as Priority } },
      include: { businessHours: true },
    });

    let responseDueAt: Date;
    let resolutionDueAt: Date;

    if (policy) {
      const deadlines = this.calculator.calculateDeadlines(
        policy.responseTimeMins,
        policy.resolutionTimeMins,
        new Date(),
        policy.businessHours?.schedule as any,
        policy.businessHours?.timezone || 'America/Sao_Paulo',
      );
      responseDueAt = deadlines.responseDueAt;
      resolutionDueAt = deadlines.resolutionDueAt;
    } else {
      responseDueAt = new Date(Date.now() + 480 * 60000);
      resolutionDueAt = new Date(Date.now() + 1440 * 60000);
    }

    return this.prisma.slaTimer.upsert({
      where: { ticketId },
      create: {
        id: ticketId,
        ticketId,
        policyId: policy?.id,
        responseDueAt,
        resolutionDueAt,
      },
      update: {
        responseDueAt,
        resolutionDueAt,
      },
    });
  }

  async getTimer(ticketId: string) {
    return this.prisma.slaTimer.findUnique({ where: { ticketId } });
  }

  async pauseTimer(ticketId: string) {
    const timer = await this.getTimer(ticketId);
    if (!timer) return null;
    return this.prisma.slaTimer.update({
      where: { ticketId },
      data: { pausedAt: new Date() },
    });
  }

  async resumeTimer(ticketId: string) {
    const timer = await this.getTimer(ticketId);
    if (!timer || !timer.pausedAt) return timer;
    const pauseDuration = Date.now() - timer.pausedAt.getTime();
    return this.prisma.slaTimer.update({
      where: { ticketId },
      data: {
        pausedAt: null,
        resumedAt: new Date(),
        responseDueAt: new Date(timer.responseDueAt.getTime() + pauseDuration),
        resolutionDueAt: new Date(timer.resolutionDueAt.getTime() + pauseDuration),
      },
    });
  }

  async markFirstResponse(ticketId: string) {
    const timer = await this.getTimer(ticketId);
    if (!timer || timer.responseMetAt) return timer;
    const responseBreached = new Date() > timer.responseDueAt;
    return this.prisma.slaTimer.update({
      where: { ticketId },
      data: { responseMetAt: new Date(), responseBreached },
    });
  }

  async markResolved(ticketId: string) {
    const timer = await this.getTimer(ticketId);
    if (!timer || timer.resolutionMetAt) return timer;
    const resolutionBreached = new Date() > timer.resolutionDueAt;
    return this.prisma.slaTimer.update({
      where: { ticketId },
      data: { resolutionMetAt: new Date(), resolutionBreached },
    });
  }

  async getBreaches() {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 30 * 60000);
    return this.prisma.slaTimer.findMany({
      where: {
        resolutionMetAt: null,
        pausedAt: null,
        OR: [
          { responseDueAt: { lt: now, gte: new Date(now.getTime() - 24 * 60 * 60000) }, responseMetAt: null },
          { resolutionDueAt: { lt: now, gte: new Date(now.getTime() - 24 * 60 * 60000) }, resolutionMetAt: null },
        ],
      },
      include: { ticket: { select: { id: true, title: true, sector: true, priority: true } } },
      orderBy: { resolutionDueAt: 'asc' },
    });
  }

  async getDashboard() {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 30 * 60000);
    const [total, responseBreached, resolutionBreached, responseWarning, resolutionWarning] = await Promise.all([
      this.prisma.slaTimer.count({ where: { resolutionMetAt: null } }),
      this.prisma.slaTimer.count({ where: { responseBreached: true, responseMetAt: null } }),
      this.prisma.slaTimer.count({ where: { resolutionBreached: true, resolutionMetAt: null } }),
      this.prisma.slaTimer.count({ where: { responseBreached: false, responseMetAt: null, responseDueAt: { lt: warningThreshold } } }),
      this.prisma.slaTimer.count({ where: { resolutionBreached: false, resolutionMetAt: null, resolutionDueAt: { lt: warningThreshold } } }),
    ]);
    return { total, responseBreached, resolutionBreached, responseWarning, resolutionWarning };
  }
}