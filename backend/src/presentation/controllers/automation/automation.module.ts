/**
 * Automation Module
 */

import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationEngineService } from '../../../infrastructure/services/automation-engine.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { WebhookModule } from '../../../infrastructure/services/webhook.module';

@Module({
  imports: [PrismaModule, WebhookModule],
  controllers: [AutomationController],
  providers: [AutomationEngineService],
  exports: [AutomationEngineService],
})
export class AutomationModule {}
