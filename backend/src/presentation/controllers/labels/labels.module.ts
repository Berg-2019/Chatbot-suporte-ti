import { Module } from '@nestjs/common';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService], // Exportar para usar em outros módulos
})
export class LabelsModule {}
