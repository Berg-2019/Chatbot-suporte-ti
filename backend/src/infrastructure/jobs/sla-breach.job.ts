import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AlertService } from '../../infrastructure/services/alert.service';
import { RabbitMQService } from '../../infrastructure/messaging/rabbitmq.service';
import { Sector } from '@prisma/client';
import { redactName } from '../../infrastructure/logger/redact';

interface EscalationAction {
  type: 'NOTIFY_MANAGER' | 'REASSIGN' | 'ESCALATE_TO_L2' | 'ESCALATE_TO_L3';
  targetUserId?: string;
  targetLevel?: 'N2' | 'N3';
  message?: string;
}

@Injectable()
export class SlaBreachJob {
  private readonly logger = new Logger(SlaBreachJob.name);

  constructor(
    private prisma: PrismaService,
    private alertService: AlertService,
    private rabbitmq: RabbitMQService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleSlaBreaches() {
    this.logger.debug('Running SLA breach check...');

    const now = new Date();

    const breachedTimers = await this.prisma.slaTimer.findMany({
      where: {
        resolutionMetAt: null,
        pausedAt: null,
        resolutionBreached: false,
        resolutionDueAt: { lt: now },
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            sector: true,
            priority: true,
            assignedToId: true,
            assignedTo: { select: { id: true, name: true, technicianLevel: true } },
          },
        },
      },
    });

    for (const timer of breachedTimers) {
      if (!timer.ticket) continue;

      await this.prisma.slaTimer.update({
        where: { ticketId: timer.ticketId },
        data: { resolutionBreached: true },
      });

      this.logger.warn(`SLA breach detected for ticket ${timer.ticketId}`);
      await this.applyEscalationRules(timer.ticket, 'SLA_BREACHED', timer.resolutionDueAt);

      if (timer.ticket.assignedToId) {
        await this.alertService.alertSLABreach(timer.ticketId, timer.ticket.assignedToId);
      }

      await this.rabbitmq.publishNotification({
        type: 'technician_alert',
        ticketId: timer.ticketId,
        payload: {
          ticketId: timer.ticketId,
          title: timer.ticket.title,
          sector: timer.ticket.sector,
          priority: timer.ticket.priority,
          breachedAt: now,
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleImminentBreaches() {
    const now = new Date();
    const imminentThreshold = new Date(now.getTime() + 20 * 60000);

    const imminentTimers = await this.prisma.slaTimer.findMany({
      where: {
        resolutionMetAt: null,
        pausedAt: null,
        resolutionBreached: false,
        resolutionDueAt: { gt: now, lt: imminentThreshold },
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            sector: true,
            priority: true,
            assignedToId: true,
          },
        },
      },
    });

    for (const timer of imminentTimers) {
      if (timer.ticket?.assignedToId) {
        await this.applyEscalationRules(timer.ticket as any, 'SLA_BREACH_IMMINENT', timer.resolutionDueAt);
        const remaining = timer.resolutionDueAt.getTime() - now.getTime();
        const remainingStr = remaining >= 60000
          ? `${Math.floor(remaining / 60000)}min`
          : `${Math.floor(remaining / 1000)}s`;
        await this.alertService.alertSLAWarning(timer.ticketId, timer.ticket.assignedToId, remainingStr);
      }
    }
  }

  private async applyEscalationRules(
    ticket: { id: string; title: string; sector: Sector | null; priority: string; assignedToId: string | null },
    trigger: 'SLA_BREACH_IMMINENT' | 'SLA_BREACHED',
    breachedAt: Date,
  ) {
    const rules = await this.prisma.escalationRule.findMany({
      where: {
        sector: ticket.sector as Sector,
        triggerOn: trigger,
        active: true,
      },
      orderBy: { triggerAfterMins: 'asc' },
    });

    for (const rule of rules) {
      const action = rule.action as unknown as EscalationAction;
      switch (action.type) {
        case 'NOTIFY_MANAGER':
          if (action.targetUserId) {
            await this.alertService.sendAlertToUser(action.targetUserId, {
              ticketId: ticket.id,
              type: 'SLA_BREACH',
              title: `SLA ${trigger === 'SLA_BREACH_IMMINENT' ? 'Iminiente' : 'Estourado'}`,
              message: `Ticket ${ticket.id.slice(-6)}: ${ticket.title} - Setor ${ticket.sector}`,
            });
          }
          break;

        case 'REASSIGN':
          if (action.targetUserId) {
            await this.prisma.ticket.update({
              where: { id: ticket.id },
              data: { assignedToId: action.targetUserId },
            });
            this.logger.log(`Ticket ${ticket.id} reassigned to ${action.targetUserId}`);
          }
          break;

        case 'ESCALATE_TO_L2':
        case 'ESCALATE_TO_L3': {
          const targetLevel = action.type === 'ESCALATE_TO_L2' ? 'N2' : 'N3';
          const currentLevel = ticket.assignedToId
            ? (await this.prisma.user.findUnique({ where: { id: ticket.assignedToId }, select: { technicianLevel: true } }))?.technicianLevel
            : null;

          if (currentLevel === targetLevel) break;

          const seniorTechs = await this.prisma.user.findFirst({
            where: { technicianLevel: targetLevel, active: true, sector: ticket.sector as Sector },
            select: { id: true, name: true },
          });

          if (seniorTechs) {
            await this.prisma.ticket.update({
              where: { id: ticket.id },
              data: { assignedToId: seniorTechs.id },
            });
            await this.alertService.alertEscalation(ticket.id, targetLevel, {
              title: ticket.title,
              fromLevel: currentLevel || 'N1',
              elapsed: `${Math.floor((Date.now() - breachedAt.getTime()) / 60000)}min`,
            });
            this.logger.log(`Ticket ${ticket.id} escalated to ${targetLevel}, assigned to uid:${seniorTechs.id.slice(0, 8)}`);
          }
          break;
        }
      }
    }
  }
}