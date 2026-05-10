import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

const RETENTION_DAYS = 90;
const BATCH_SIZE = 500;

@Injectable()
export class DataRetentionJob {
  private readonly logger = new Logger(DataRetentionJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRetention() {
    this.logger.log('Iniciando limpeza de dados retidos...');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const results: Record<string, number> = {};

    for (const model of ['Message', 'Ticket', 'Contact', 'User'] as const) {
      try {
        const count = await (this.prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)].deleteMany({
          where: {
            deletedAt: { not: null, lte: cutoff },
          },
        });
        results[model] = count.count;
        if (count.count > 0) {
          this.logger.log(`Removidos ${count.count} registros de ${model} (soft-deleted > ${RETENTION_DAYS} dias)`);
        }
      } catch (error) {
        this.logger.error(`Erro ao limpar ${model}: ${error.message}`);
      }
    }

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    if (total > 0) {
      this.logger.log(`Retenção concluída: ${total} registros removidos permanentemente`);
    }
  }
}
