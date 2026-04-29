import { Module } from '@nestjs/common';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';
import { SlaCalculatorService } from '../../../infrastructure/sla/sla-calculator.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  controllers: [SlaController],
  providers: [SlaService, SlaCalculatorService, PrismaService],
  exports: [SlaService, SlaCalculatorService],
})
export class SlaModule {}