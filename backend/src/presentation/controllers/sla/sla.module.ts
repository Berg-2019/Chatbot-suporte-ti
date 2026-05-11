import { Module } from '@nestjs/common';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';
import { SlaSeedService } from './sla-seed.service';
import { SlaCalculatorService } from '../../../infrastructure/sla/sla-calculator.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AlertService } from '../../../infrastructure/services/alert.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { SlaBreachJob } from '../../../infrastructure/jobs/sla-breach.job';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  controllers: [SlaController],
  providers: [SlaService, SlaSeedService, SlaCalculatorService, PrismaService, AlertService, RabbitMQService, SlaBreachJob],
  exports: [SlaService, SlaCalculatorService],
})
export class SlaModule {}