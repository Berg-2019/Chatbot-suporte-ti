import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SlaCalculatorService } from '../../../infrastructure/sla/sla-calculator.service';
import { AlertService } from '../../../infrastructure/services/alert.service';
import { Priority, Sector } from '@prisma/client';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private prisma: PrismaService,
    private calculator: SlaCalculatorService,
    private alertService: AlertService,
  ) {}

  async createTimerForTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return null;

    const sector = (ticket.sector || 'TI') as Sector;
    const priority = (ticket.priority || 'NORMAL') as Priority;

    const policy = await this.prisma.slaPolicy.findUnique({
      where: { sector_priority: { sector, priority } },
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

    const timer = await this.prisma.slaTimer.upsert({
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

    this.logger.log(`SLA timer created for ticket ${ticketId}: response due ${responseDueAt.toISOString()}, resolution due ${resolutionDueAt.toISOString()}`);
    return timer;
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

    const updated = await this.prisma.slaTimer.update({
      where: { ticketId },
      data: { responseMetAt: new Date(), responseBreached },
    });

    if (responseBreached) {
      this.logger.warn(`Response SLA breached for ticket ${ticketId}`);
      const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
      if (ticket?.assignedToId) {
        await this.alertService.alertSLABreach(ticketId, ticket.assignedToId);
      }
    }

    return updated;
  }

  async markResolved(ticketId: string) {
    const timer = await this.getTimer(ticketId);
    if (!timer || timer.resolutionMetAt) return timer;
    const resolutionBreached = new Date() > timer.resolutionDueAt;

    const updated = await this.prisma.slaTimer.update({
      where: { ticketId },
      data: { resolutionMetAt: new Date(), resolutionBreached },
    });

    if (resolutionBreached) {
      this.logger.warn(`Resolution SLA breached for ticket ${ticketId}`);
    }

    return updated;
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

  /**
   * Cron job: Verificar breaches e alertas de SLA a cada 5 minutos
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSlaBreachesAndAlerts() {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 30 * 60000);

    const timers = await this.prisma.slaTimer.findMany({
      where: {
        resolutionMetAt: null,
        pausedAt: null,
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            sector: true,
            priority: true,
            assignedToId: true,
            status: true,
          },
        },
      },
    });

    for (const timer of timers) {
      if (!timer.ticket) continue;

      // Verificar resolution breach
      if (now > timer.resolutionDueAt && !timer.resolutionBreached) {
        this.logger.warn(`Resolution SLA breached for ticket ${timer.ticketId}`);
        await this.prisma.slaTimer.update({
          where: { ticketId: timer.ticketId },
          data: { resolutionBreached: true },
        });

        if (timer.ticket.assignedToId) {
          await this.alertService.alertSLABreach(timer.ticketId, timer.ticket.assignedToId);
        }
      }

      // Verificar response breach
      if (now > timer.responseDueAt && !timer.responseBreached && !timer.responseMetAt) {
        this.logger.warn(`Response SLA breached for ticket ${timer.ticketId}`);
        await this.prisma.slaTimer.update({
          where: { ticketId: timer.ticketId },
          data: { responseBreached: true },
        });

        if (timer.ticket.assignedToId) {
          await this.alertService.alertSLABreach(timer.ticketId, timer.ticket.assignedToId);
        }
      }

      // Verificar warning (75% do tempo)
      if (!timer.resolutionBreached && !timer.resolutionMetAt) {
        const remaining = timer.resolutionDueAt.getTime() - now.getTime();
        if (remaining > 0 && remaining <= 30 * 60000) {
          const remainingStr = remaining >= 60000
            ? `${Math.floor(remaining / 60000)}min`
            : `${Math.floor(remaining / 1000)}s`;

          if (timer.ticket.assignedToId) {
            await this.alertService.alertSLAWarning(timer.ticketId, timer.ticket.assignedToId, remainingStr);
          }
        }
      }
    }
  }
}