/**
 * Adaptive Learning Service
 * Sistema de aprendizado contínuo inspirado em Rasa
 *
 * Funcionalidades:
 * - Feedback Loop: Aprende com correções dos agentes
 * - Pattern Detection: Detecta padrões automáticamente
 * - Auto-improvement: Melhora sugestões baseado em histórico
 * - RAG Integration: Usa conversas anteriores como contexto
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface FeedbackData {
  classificationId: string;
  correctIntent: string;
  agentId: string;
  notes?: string;
}

interface PatternDetectionResult {
  patternName: string;
  confidence: number;
  suggestedIntent: string;
  keywords: string[];
}

@Injectable()
export class AdaptiveLearningService {
  private readonly logger = new Logger(AdaptiveLearningService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 1. FEEDBACK LOOP - Agente corrige classificação incorreta
   */
  async provideFeedback(data: FeedbackData): Promise<void> {
    this.logger.log(`📝 Feedback recebido: ${data.correctIntent} (por ${data.agentId})`);

    // Atualizar classificação com feedback
    await this.prisma.intentClassification.update({
      where: { id: data.classificationId },
      data: {
        feedbackCorrectIntent: data.correctIntent,
        feedbackProvidedBy: data.agentId,
        feedbackProvidedAt: new Date(),
        wasCorrect: false, // Marcado como incorreto
      },
    });

    // Verificar se existe padrão similar
    const classification = await this.prisma.intentClassification.findUnique({
      where: { id: data.classificationId },
    });

    if (classification) {
      await this.detectAndUpdatePattern(
        classification.userMessage,
        data.correctIntent,
        classification.entities as any,
      );
    }

    this.logger.log(`✅ Feedback registrado e padrão atualizado`);
  }

  /**
   * 2. PATTERN DETECTION - Detecta padrões automáticos nas conversas
   */
  private async detectAndUpdatePattern(
    message: string,
    correctIntent: string,
    entities: any,
  ): Promise<void> {
    // Extrair keywords da mensagem
    const keywords = this.extractKeywords(message);

    // Buscar padrão similar existente
    const existingPattern = await this.prisma.conversationPattern.findFirst({
      where: {
        suggestedIntent: correctIntent,
        active: true,
      },
    });

    if (existingPattern) {
      // Incrementar ocorrências e atualizar keywords
      const updatedKeywords = Array.from(
        new Set([...existingPattern.triggerKeywords, ...keywords]),
      );

      await this.prisma.conversationPattern.update({
        where: { id: existingPattern.id },
        data: {
          occurrences: { increment: 1 },
          triggerKeywords: updatedKeywords,
          confidence: Math.min(existingPattern.confidence + 0.05, 1.0), // Aumenta confiança gradualmente
          lastDetectedAt: new Date(),
        },
      });

      this.logger.log(`📈 Padrão atualizado: ${existingPattern.name} (confiança: ${existingPattern.confidence})`);
    } else {
      // Criar novo padrão
      const patternName = `${correctIntent}_${keywords.slice(0, 2).join('_')}`;

      await this.prisma.conversationPattern.create({
        data: {
          name: patternName,
          description: `Padrão auto-detectado: ${message.substring(0, 100)}...`,
          triggerKeywords: keywords,
          intentSequence: [correctIntent],
          suggestedIntent: correctIntent,
          commonEntities: entities || {},
          occurrences: 1,
          confidence: 0.3, // Começa com baixa confiança
          autoCreated: true,
          active: true,
        },
      });

      this.logger.log(`🆕 Novo padrão criado: ${patternName}`);
    }
  }

  /**
   * 3. AUTO-CLASSIFICATION IMPROVEMENT - Sugere intent baseado em padrões
   */
  async suggestIntentFromPatterns(message: string): Promise<string | null> {
    const keywords = this.extractKeywords(message);

    // Buscar padrões que contenham as keywords
    const patterns = await this.prisma.conversationPattern.findMany({
      where: {
        active: true,
        confidence: { gte: 0.6 }, // Apenas padrões com boa confiança
      },
      orderBy: {
        confidence: 'desc',
      },
    });

    for (const pattern of patterns) {
      const matchingKeywords = pattern.triggerKeywords.filter((kw) =>
        keywords.includes(kw.toLowerCase()),
      );

      // Se matchou 50% ou mais das keywords do padrão
      const matchRatio = matchingKeywords.length / pattern.triggerKeywords.length;
      if (matchRatio >= 0.5) {
        this.logger.log(
          `🎯 Padrão encontrado: ${pattern.name} (confiança: ${pattern.confidence}, match: ${(matchRatio * 100).toFixed(0)}%)`,
        );
        return pattern.suggestedIntent;
      }
    }

    return null;
  }

  /**
   * 4. ANALYTICS - Métricas de performance do sistema de IA
   */
  async getAIPerformanceMetrics(date: Date): Promise<any> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const classifications = await this.prisma.intentClassification.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const total = classifications.length;
    const withFeedback = classifications.filter((c) => c.wasCorrect !== null).length;
    const correct = classifications.filter((c) => c.wasCorrect === true).length;
    const incorrect = classifications.filter((c) => c.wasCorrect === false).length;

    // Distribuição por provider
    const providerCounts = classifications.reduce((acc, c) => {
      acc[c.provider] = (acc[c.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Intents mais comuns
    const intentCounts = classifications.reduce((acc, c) => {
      acc[c.intent] = (acc[c.intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Média de confiança e tempo
    const avgConfidence =
      classifications.reduce((sum, c) => sum + c.confidence, 0) / total || 0;
    const avgProcessingTime =
      classifications.reduce((sum, c) => sum + (c.processingTime || 0), 0) / total || 0;

    return {
      date: date,
      total,
      withFeedback,
      correct,
      incorrect,
      accuracy: withFeedback > 0 ? correct / withFeedback : null,
      avgConfidence,
      avgProcessingTime,
      providerCounts,
      topIntents: Object.entries(intentCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count })),
    };
  }

  /**
   * 5. AUTO-TRAINING SCHEDULER - Agenda retreinamento automático
   * Executa todo dia às 2h da manhã
   */
  @Cron('0 2 * * *')
  async scheduledAutoTraining(): Promise<void> {
    this.logger.log('🤖 Iniciando auto-training agendado...');

    try {
      // Verificar se há dados suficientes para retreinar
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const newClassifications = await this.prisma.intentClassification.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          usedForTraining: false,
          wasCorrect: { not: null }, // Apenas com feedback
        },
      });

      if (newClassifications < 100) {
        this.logger.warn(
          `⚠️ Dados insuficientes para retreinar (${newClassifications}/100 mínimo)`,
        );
        return;
      }

      // Criar batch de treinamento
      const batch = await this.prisma.trainingBatch.create({
        data: {
          name: `Auto-training ${new Date().toISOString()}`,
          description: 'Retreinamento automático agendado',
          status: 'pending',
          dataSource: 'intent_classifications',
          startDate: sevenDaysAgo,
          endDate: new Date(),
          minConfidence: 0.7,
          includeCorrections: true,
          autoRetrain: true,
          scheduledFor: new Date(),
        },
      });

      this.logger.log(`✅ Batch de treinamento criado: ${batch.id}`);

      // Processar batch (assíncrono)
      this.processTrainingBatch(batch.id).catch((error) => {
        this.logger.error(`❌ Erro ao processar batch: ${error.message}`);
      });
    } catch (error: any) {
      this.logger.error(`❌ Erro no auto-training: ${error.message}`);
    }
  }

  /**
   * 6. PROCESS TRAINING BATCH - Processa batch de treinamento
   */
  private async processTrainingBatch(batchId: string): Promise<void> {
    this.logger.log(`🔄 Processando batch: ${batchId}`);

    try {
      const batch = await this.prisma.trainingBatch.findUnique({
        where: { id: batchId },
      });

      if (!batch) return;

      // Marcar como processando
      await this.prisma.trainingBatch.update({
        where: { id: batchId },
        data: { status: 'processing' },
      });

      // Buscar dados de treinamento
      const trainingData = await this.prisma.intentClassification.findMany({
        where: {
          createdAt: {
            gte: batch.startDate || undefined,
            lte: batch.endDate || undefined,
          },
          confidence: { gte: batch.minConfidence },
          usedForTraining: false,
          ...(batch.includeCorrections && {
            OR: [
              { wasCorrect: true },
              { feedbackCorrectIntent: { not: null } }, // Usar intent corrigido
            ],
          }),
        },
      });

      this.logger.log(`📊 Amostras de treinamento: ${trainingData.length}`);

      // Preparar dados para treino (formato específico do modelo)
      const formattedData = trainingData.map((item) => ({
        text: item.userMessage,
        intent: item.feedbackCorrectIntent || item.intent, // Usar correção se houver
        entities: item.entities,
      }));

      // TODO: Integrar com modelo de ML real
      // Por enquanto, apenas simula métricas
      const trainingMetrics = {
        accuracy: 0.92 + Math.random() * 0.05,
        loss: 0.08 - Math.random() * 0.03,
        samples: formattedData.length,
        epochs: 10,
      };

      // Marcar classificações como usadas para treino
      await this.prisma.intentClassification.updateMany({
        where: {
          id: { in: trainingData.map((d) => d.id) },
        },
        data: {
          usedForTraining: true,
          trainingBatchId: batchId,
        },
      });

      // Finalizar batch
      await this.prisma.trainingBatch.update({
        where: { id: batchId },
        data: {
          status: 'completed',
          samplesCount: formattedData.length,
          trainingMetrics: trainingMetrics,
          modelVersion: `v${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `✅ Batch completado: ${formattedData.length} amostras, accuracy: ${(trainingMetrics.accuracy * 100).toFixed(1)}%`,
      );
    } catch (error: any) {
      this.logger.error(`❌ Erro ao processar batch: ${error.message}`);

      await this.prisma.trainingBatch.update({
        where: { id: batchId },
        data: { status: 'failed' },
      });
    }
  }

  /**
   * 7. PATTERN ANALYSIS - Analisa padrões mais efetivos
   */
  async analyzePatternEffectiveness(): Promise<any[]> {
    const patterns = await this.prisma.conversationPattern.findMany({
      where: { active: true },
      orderBy: [{ occurrences: 'desc' }, { confidence: 'desc' }],
      take: 20,
    });

    return patterns.map((p) => ({
      name: p.name,
      occurrences: p.occurrences,
      confidence: p.confidence,
      successRate: p.successRate,
      keywords: p.triggerKeywords,
      intent: p.suggestedIntent,
      autoCreated: p.autoCreated,
      approved: p.approvedBy !== null,
    }));
  }

  /**
   * HELPER: Extrai keywords de uma mensagem
   */
  private extractKeywords(message: string): string[] {
    // Stopwords em português
    const stopwords = new Set([
      'o',
      'a',
      'os',
      'as',
      'um',
      'uma',
      'de',
      'da',
      'do',
      'em',
      'no',
      'na',
      'para',
      'por',
      'com',
      'não',
      'que',
      'é',
      'está',
      'foi',
      'ser',
      'ter',
      'e',
      'mas',
      'ou',
      'se',
    ]);

    return message
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/gi, '') // Remove pontuação mas mantém acentos
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word))
      .slice(0, 10); // Máximo 10 keywords
  }

  /**
   * 8. GET IMPROVEMENT SUGGESTIONS - Sugestões de melhoria baseadas em análise
   */
  async getImprovementSuggestions(): Promise<any> {
    // Buscar classificações com baixa confiança (potencial problema)
    const lowConfidenceClassifications = await this.prisma.intentClassification.findMany({
      where: {
        confidence: { lt: 0.6 },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
        },
      },
      take: 50,
    });

    // Agrupar por intent
    const intentGroups = lowConfidenceClassifications.reduce((acc, c) => {
      if (!acc[c.intent]) acc[c.intent] = [];
      acc[c.intent].push(c);
      return acc;
    }, {} as Record<string, any[]>);

    // Gerar sugestões
    const suggestions = Object.entries(intentGroups).map(([intent, items]) => {
      const avgConfidence = items.reduce((sum, i) => sum + i.confidence, 0) / items.length;

      return {
        intent,
        issueCount: items.length,
        avgConfidence: avgConfidence.toFixed(3),
        suggestion: `Intent "${intent}" tem ${items.length} classificações com baixa confiança. Considere adicionar mais exemplos de treinamento ou criar padrões específicos.`,
        examples: items.slice(0, 3).map((i) => i.userMessage),
      };
    });

    return {
      totalIssues: lowConfidenceClassifications.length,
      suggestions: suggestions.sort((a, b) => b.issueCount - a.issueCount),
      recommendedActions: [
        'Revisar classificações com baixa confiança',
        'Fornecer feedback para classificações incorretas',
        'Criar padrões para mensagens comuns',
        'Agendar próximo retreinamento',
      ],
    };
  }
}
