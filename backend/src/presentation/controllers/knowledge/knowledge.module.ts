/**
 * Knowledge Module
 */

import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeSearchService } from './knowledge-search.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IntentModule } from '../intent/intent.module';

@Module({
  imports: [IntentModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeSearchService, PrismaService],
  exports: [KnowledgeService, KnowledgeSearchService],
})
export class KnowledgeModule {}
