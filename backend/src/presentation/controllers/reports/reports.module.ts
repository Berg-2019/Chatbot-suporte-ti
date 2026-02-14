/**
 * Reports Module - Módulo de Relatórios (inclui recipients e relatórios detalhados)
 */

import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportRecipientsController } from './report-recipients.controller';
import { ReportRecipientsService } from './report-recipients.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { MetricsModule } from '../metrics/metrics.module';
import { RabbitMQModule } from '../../../infrastructure/messaging/rabbitmq.module';

@Module({
    imports: [PrismaModule, MetricsModule, RabbitMQModule],
    controllers: [ReportsController, ReportRecipientsController],
    providers: [ReportsService, ReportRecipientsService],
    exports: [ReportsService, ReportRecipientsService],
})
export class ReportsModule { }
