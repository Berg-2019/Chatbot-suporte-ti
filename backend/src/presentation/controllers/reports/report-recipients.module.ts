import { Module } from '@nestjs/common';
import { ReportRecipientsController } from './report-recipients.controller';
import { ReportRecipientsService } from './report-recipients.service';
import { RabbitMQModule } from '../../../infrastructure/messaging/rabbitmq.module';

@Module({
    imports: [RabbitMQModule],
    controllers: [ReportRecipientsController],
    providers: [ReportRecipientsService],
    exports: [ReportRecipientsService],
})
export class ReportRecipientsModule { }
