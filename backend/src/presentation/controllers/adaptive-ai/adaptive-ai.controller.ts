/**
 * Adaptive AI Controller
 * Endpoints para sistema de IA adaptativo
 */

import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdaptiveLearningService } from '../../../infrastructure/ai/adaptive-learning.service';
import { RAGService } from '../../../infrastructure/ai/rag.service';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AdaptiveAIController {
  constructor(
    private adaptiveLearning: AdaptiveLearningService,
    private ragService: RAGService,
  ) {}

  /**
   * 1. Fornecer feedback sobre classificação (agente corrige intent)
   * POST /api/ai/feedback
   */
  @Post('feedback')
  async provideFeedback(
    @Body()
    data: {
      classificationId: string;
      correctIntent: string;
      agentId: string;
      notes?: string;
    },
  ) {
    await this.adaptiveLearning.provideFeedback(data);
    return {
      success: true,
      message: 'Feedback registrado com sucesso',
    };
  }

  /**
   * 2. Obter métricas de performance da IA
   * GET /api/ai/performance?date=2024-01-01
   */
  @Get('performance')
  async getPerformance(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.adaptiveLearning.getAIPerformanceMetrics(date);
  }

  /**
   * 3. Analisar efetividade de padrões
   * GET /api/ai/patterns
   */
  @Get('patterns')
  async getPatterns() {
    return this.adaptiveLearning.analyzePatternEffectiveness();
  }

  /**
   * 4. Obter sugestões de melhoria
   * GET /api/ai/suggestions
   */
  @Get('suggestions')
  async getSuggestions() {
    return this.adaptiveLearning.getImprovementSuggestions();
  }

  /**
   * 5. Buscar conversas similares (RAG)
   * POST /api/ai/similar-conversations
   */
  @Post('similar-conversations')
  async findSimilarConversations(
    @Body() data: { query: string; limit?: number },
  ) {
    return this.ragService.findSimilarConversations(data.query, data.limit || 5);
  }

  /**
   * 6. Gerar contexto enriquecido
   * POST /api/ai/generate-context
   */
  @Post('generate-context')
  async generateContext(@Body() data: { query: string }) {
    const context = await this.ragService.generateContext(data.query);
    return { context };
  }

  /**
   * 7. Armazenar conversa para RAG
   * POST /api/ai/store-conversation
   */
  @Post('store-conversation')
  async storeConversation(
    @Body()
    data: {
      ticketId?: string;
      phoneNumber: string;
      agentId?: string;
      messages: Array<{ role: string; content: string; timestamp: string }>;
      primaryIntent?: string;
      wasSuccessful: boolean;
      resolutionType?: string;
    },
  ) {
    await this.ragService.storeConversation(data);
    return {
      success: true,
      message: 'Conversa armazenada com sucesso',
    };
  }

  /**
   * 8. Estatísticas de conversas armazenadas
   * GET /api/ai/conversation-stats
   */
  @Get('conversation-stats')
  async getConversationStats() {
    return this.ragService.getConversationStats();
  }

  /**
   * 9. Criar batch de treinamento manual
   * POST /api/ai/training-batch
   */
  @Post('training-batch')
  async createTrainingBatch(
    @Body()
    data: {
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      minConfidence?: number;
    },
  ) {
    // TODO: Implementar criação manual de batch
    return {
      success: true,
      message: 'Batch de treinamento criado (em desenvolvimento)',
    };
  }

  /**
   * 10. Dashboard completo de IA
   * GET /api/ai/dashboard
   */
  @Get('dashboard')
  async getDashboard() {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [performance, patterns, suggestions, conversationStats] = await Promise.all([
      this.adaptiveLearning.getAIPerformanceMetrics(today),
      this.adaptiveLearning.analyzePatternEffectiveness(),
      this.adaptiveLearning.getImprovementSuggestions(),
      this.ragService.getConversationStats(),
    ]);

    return {
      performance,
      topPatterns: patterns.slice(0, 5),
      suggestions,
      conversationStats,
      summary: {
        totalClassifications: performance.total,
        accuracy: performance.accuracy
          ? `${(performance.accuracy * 100).toFixed(1)}%`
          : 'N/A',
        avgConfidence: `${(performance.avgConfidence * 100).toFixed(1)}%`,
        topIntent: performance.topIntents[0]?.intent || 'N/A',
        conversationsStored: conversationStats.total,
        ragUsageRate: conversationStats.topUsedContexts.length > 0 ? 'Ativo' : 'Inativo',
      },
    };
  }
}
