import { Module } from '@nestjs/common';
import { ReportRecipientsController } from './report-recipients.controller';
import { ReportRecipientsService } from './report-recipients.service';
import { RabbitMQModule } from '../../../infrastructure/messaging/rabbitmq.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
    imports: [RabbitMQModule, MetricsModule],
    controllers: [ReportRecipientsController],
    providers: [ReportRecipientsService],
    exports: [ReportRecipientsService],
})
export class ReportRecipientsModule { }
