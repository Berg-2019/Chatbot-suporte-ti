/**
 * Automation Module
 */

import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationEngineService } from '../../../infrastructure/services/automation-engine.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [PrismaModule, WebhooksModule],
  controllers: [AutomationController],
  providers: [AutomationEngineService],
  exports: [AutomationEngineService],
})
export class AutomationModule {}
