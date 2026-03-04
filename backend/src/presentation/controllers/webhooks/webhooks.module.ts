import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhookService } from '../../../infrastructure/services/webhook.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
// import { RolesModule } from '../roles/roles.module';  // DISABLED - requires customRole model

@Module({
  // imports: [PrismaModule, RolesModule],  // DISABLED - requires customRole model
  controllers: [WebhooksController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhooksModule {}
