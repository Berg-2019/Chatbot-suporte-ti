import { Module } from '@nestjs/common';
import { AgentMetricsController } from './agent-metrics.controller';
import { AgentMetricsService } from './agent-metrics.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AgentMetricsController],
  providers: [AgentMetricsService],
  exports: [AgentMetricsService], // Exportar para usar em outros módulos
})
export class AgentMetricsModule {}
