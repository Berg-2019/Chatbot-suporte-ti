/**
 * CSAT Module
 */

import { Module } from '@nestjs/common';
import { CsatController } from './csat.controller';
import { CsatService } from '../../../infrastructure/services/csat.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [PrismaModule, AutomationModule],
  controllers: [CsatController],
  providers: [CsatService],
  exports: [CsatService],
})
export class CsatModule {}
