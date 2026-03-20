/**
 * Adaptive AI Module
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdaptiveAIController } from './adaptive-ai.controller';
import { AdaptiveLearningService } from '../../../infrastructure/ai/adaptive-learning.service';
import { RAGService } from '../../../infrastructure/ai/rag.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AdaptiveAIController],
  providers: [AdaptiveLearningService, RAGService, PrismaService],
  exports: [AdaptiveLearningService, RAGService],
})
export class AdaptiveAIModule {}
