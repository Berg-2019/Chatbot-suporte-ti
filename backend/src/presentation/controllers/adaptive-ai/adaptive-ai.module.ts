/**
 * Adaptive AI Module
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdaptiveAIController } from './adaptive-ai.controller';
import { AdaptiveLearningService } from '../../../infrastructure/ai/adaptive-learning.service';
import { RAGService } from '../../../infrastructure/ai/rag.service';
import { KnowledgeBaseService } from '../../../infrastructure/ai/knowledge-base.service';
import { MinimaxEmbeddingsService } from '../../../infrastructure/ai/minimax-embeddings.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AdaptiveAIController],
  providers: [AdaptiveLearningService, RAGService, KnowledgeBaseService, MinimaxEmbeddingsService, PrismaService],
  exports: [AdaptiveLearningService, RAGService, KnowledgeBaseService],
})
export class AdaptiveAIModule {}
