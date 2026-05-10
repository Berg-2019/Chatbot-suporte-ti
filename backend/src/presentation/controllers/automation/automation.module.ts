/**
 * Automation Module
 */

import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationEngineService } from '../../../infrastructure/services/automation-engine.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [PrismaModule, WebhooksModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationEngineService],
  exports: [AutomationService, AutomationEngineService],
})
export class AutomationModule {}
