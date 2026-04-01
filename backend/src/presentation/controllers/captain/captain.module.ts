/**
 * Captain AI Module
 */

import { Module } from '@nestjs/common';
import { CaptainController } from './captain.controller';
import { CaptainAssistantService } from '../../../infrastructure/ai/captain-assistant.service';
import { RAGService } from '../../../infrastructure/ai/rag.service';
import { KnowledgeBaseService } from '../../../infrastructure/ai/knowledge-base.service';
import { MinimaxEmbeddingsService } from '../../../infrastructure/ai/minimax-embeddings.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  controllers: [CaptainController],
  providers: [
    CaptainAssistantService,
    RAGService,
    KnowledgeBaseService,
    MinimaxEmbeddingsService,
    PrismaService,
  ],
  exports: [CaptainAssistantService],
})
export class CaptainModule {}
