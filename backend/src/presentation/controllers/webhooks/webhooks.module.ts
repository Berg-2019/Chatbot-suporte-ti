import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhookService } from '../../../infrastructure/services/webhook.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [PrismaModule, RolesModule],
  controllers: [WebhooksController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhooksModule {}
