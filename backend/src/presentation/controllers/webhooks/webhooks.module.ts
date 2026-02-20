import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhookService } from '../../../infrastructure/services/webhook.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebhooksController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhooksModule {}
