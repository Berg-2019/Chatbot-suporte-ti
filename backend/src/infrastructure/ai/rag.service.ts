/**
 * RAG Service - Retrieval Augmented Generation
 * Busca conversas similares anteriores para usar como contexto
 *
 * Funcionalidades:
 * - Embedding de conversas com MiniMax
 * - Busca semântica por similaridade
 * - Geração de resumos automáticos
 * - Context injection para melhorar respostas
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import axios from 'axios';

export interface SimilarConversation {
  id: string;
  similarity: number;
  summary: string;
  resolution: string;
  messages: any[];
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private minimaxApiKey: string;
  private glmApiKey: string;

  constructor(private prisma: PrismaService) {
    this.minimaxApiKey = process.env.MINIMAX_API_KEY || '';
    this.glmApiKey = process.env.GLM_API_KEY || '';
  }

  /**
   * 1. STORE CONVERSATION - Armazena conversa completa com embeddings
   */
  async storeConversation(data: {
    ticketId?: string;
    phoneNumber: string;
    agentId?: string;
    messages: Array<{ role: string; content: string; timestamp: string }>;
    primaryIntent?: string;
    wasSuccessful: boolean;
    resolutionType?: string;
  }): Promise<void> {
    this.logger.log(`💾 Armazenando conversa: ${data.ticketId || data.phoneNumber}`);

    try {
      // Gerar resumo da conversa
      const summary = await this.generateSummary(data.messages);

      // Gerar embedding da conversa completa
      const conversationText = data.messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
      const embedding = await this.generateEmbedding(conversationText);

      // Gerar embedding do resumo (mais leve para buscas rápidas)
      const summaryEmbedding = await this.generateEmbedding(summary);

      // Extrair keywords e sentiment
      const keywords = this.extractKeywords(conversationText);
      const sentiment = this.analyzeSentiment(data.messages);

      // Salvar no banco
      await this.prisma.conversationHistory.create({
        data: {
          ticketId: data.ticketId,
          phoneNumber: data.phoneNumber,
          agentId: data.agentId,
          messages: data.messages as any,
          primaryIntent: data.primaryIntent,
          resolvedIntent: data.primaryIntent, // TODO: Pode ser diferente
          wasSuccessful: data.wasSuccessful,
          resolutionType: data.resolutionType,
          embedding: embedding as any,
          summaryEmbedding: summaryEmbedding as any,
          summary,
          keywords,
          sentiment,
        },
      });

      this.logger.log(`✅ Conversa armazenada com sucesso`);
    } catch (error: any) {
      this.logger.error(`❌ Erro ao armazenar conversa: ${error.message}`);
    }
  }

  /**
   * 2. FIND SIMILAR CONVERSATIONS - Busca conversas similares
   */
  async findSimilarConversations(
    query: string,
    limit: number = 5,
  ): Promise<SimilarConversation[]> {
    this.logger.log(`🔍 Buscando conversas similares para: "${query.substring(0, 50)}..."`);

    try {
      // Gerar embedding da query
      const queryEmbedding = await this.generateEmbedding(query);

      // Buscar todas conversas bem-sucedidas (simplificado - em produção usar vector DB)
      const conversations = await this.prisma.conversationHistory.findMany({
        where: {
          wasSuccessful: true,
          summaryEmbedding: { not: {} as any },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // Limitar busca inicial
      });

      // Calcular similaridade (cosine similarity)
      const withSimilarity = conversations
        .map((conv) => {
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            conv.summaryEmbedding as any,
          );

          return {
            id: conv.id,
            similarity,
            summary: conv.summary || '',
            resolution: conv.resolutionType || '',
            messages: conv.messages as any,
            keywords: conv.keywords,
          };
        })
        .filter((c) => c.similarity > 0.7) // Threshold de similaridade
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      this.logger.log(
        `✅ Encontradas ${withSimilarity.length} conversas similares (threshold: 0.7)`,
      );

      // Atualizar contadores de uso
      if (withSimilarity.length > 0) {
        await this.prisma.conversationHistory.updateMany({
          where: {
            id: { in: withSimilarity.map((c) => c.id) },
          },
          data: {
            usedAsContext: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
      }

      return withSimilarity;
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar conversas similares: ${error.message}`);
      return [];
    }
  }

  /**
   * 3. GENERATE CONTEXT - Gera contexto enriquecido para IA
   */
  async generateContext(query: string): Promise<string> {
    const similarConversations = await this.findSimilarConversations(query, 3);

    if (similarConversations.length === 0) {
      return '';
    }

    let context = '\n**Conversas similares anteriores:**\n\n';

    similarConversations.forEach((conv, idx) => {
      context += `${idx + 1}. (Similaridade: ${(conv.similarity * 100).toFixed(0)}%)\n`;
      context += `   Resumo: ${conv.summary}\n`;
      context += `   Resolução: ${conv.resolution}\n\n`;
    });

    return context;
  }

  /**
   * 4. GENERATE SUMMARY - Gera resumo de conversa usando LLM
   */
  private async generateSummary(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (messages.length === 0) return 'Conversa vazia';

    // Se for curta, usar diretamente
    if (messages.length <= 3) {
      return messages.map((m) => m.content).join(' | ');
    }

    try {
      const conversationText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = `Resuma esta conversa de suporte técnico em 1-2 frases:

${conversationText}

Resumo:`;

      // Usar MiniMax para gerar resumo
      if (this.minimaxApiKey) {
        const response = await axios.post(
          'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
          {
            model: 'abab6.5-chat',
            messages: [
              { role: 'user', content: prompt },
            ],
            max_tokens: 100,
            temperature: 0.3,
          },
          {
            headers: {
              Authorization: `Bearer ${this.minimaxApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        );

        return (
          response.data.choices?.[0]?.message?.content?.trim() || 'Resumo não disponível'
        );
      }

      // Fallback: Pegar primeira e última mensagem
      return `${messages[0].content.substring(0, 100)}... [Resolvido: ${messages[messages.length - 1].content.substring(0, 50)}]`;
    } catch (error: any) {
      this.logger.warn(`⚠️ Erro ao gerar resumo: ${error.message}`);
      return messages[0].content.substring(0, 200);
    }
  }

  /**
   * 5. GENERATE EMBEDDING - Gera embedding vetorial usando MiniMax
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.minimaxApiKey) {
        // Fallback: Embedding simples baseado em hash
        return this.simpleEmbedding(text);
      }

      // TODO: MiniMax ainda não tem API de embeddings pública
      // Por enquanto, usar embedding simples
      // Quando disponível, usar: https://api.minimaxi.chat/v1/embeddings

      return this.simpleEmbedding(text);
    } catch (error: any) {
      this.logger.warn(`⚠️ Erro ao gerar embedding: ${error.message}`);
      return this.simpleEmbedding(text);
    }
  }

  /**
   * HELPER: Embedding simples baseado em TF-IDF simplificado
   */
  private simpleEmbedding(text: string): number[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const wordFreq = new Map<string, number>();
    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Criar vetor de 128 dimensões baseado em hash das palavras
    const embedding = new Array(128).fill(0);
    Array.from(wordFreq.entries()).forEach(([word, freq]) => {
      const hash = this.simpleHash(word);
      embedding[hash % 128] += freq;
    });

    // Normalizar vetor
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
  }

  /**
   * HELPER: Hash simples para string
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * HELPER: Cosine similarity entre dois vetores
   */
  private cosineSimilarity(vec1: any, vec2: any): number {
    if (!Array.isArray(vec1) || !Array.isArray(vec2)) return 0;
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * HELPER: Extrai keywords
   */
  private extractKeywords(text: string): string[] {
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
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopwords.has(w));

    // Contar frequência
    const freq = new Map<string, number>();
    words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));

    // Pegar top 10 mais frequentes
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * HELPER: Analisa sentimento básico
   */
  private analyzeSentiment(
    messages: Array<{ role: string; content: string }>,
  ): string {
    const positiveWords = [
      'obrigado',
      'obrigada',
      'resolvido',
      'funcionou',
      'excelente',
      'ótimo',
      'bom',
      'perfeito',
    ];
    const negativeWords = [
      'problema',
      'erro',
      'não funciona',
      'ruim',
      'horrível',
      'péssimo',
      'urgente',
      'crítico',
    ];

    const text = messages.map((m) => m.content.toLowerCase()).join(' ');

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      if (text.includes(word)) positiveCount++;
    });

    negativeWords.forEach((word) => {
      if (text.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * 6. GET CONVERSATION STATS - Estatísticas de conversas armazenadas
   */
  async getConversationStats(): Promise<any> {
    const total = await this.prisma.conversationHistory.count();
    const successful = await this.prisma.conversationHistory.count({
      where: { wasSuccessful: true },
    });
    const withEmbeddings = await this.prisma.conversationHistory.count({
      where: { embedding: { not: {} as any } },
    });

    const sentimentDist = await this.prisma.conversationHistory.groupBy({
      by: ['sentiment'],
      _count: true,
    });

    const mostUsedAsContext = await this.prisma.conversationHistory.findMany({
      orderBy: { usedAsContext: 'desc' },
      take: 5,
      select: {
        id: true,
        summary: true,
        usedAsContext: true,
        primaryIntent: true,
      },
    });

    return {
      total,
      successful,
      successRate: total > 0 ? successful / total : 0,
      withEmbeddings,
      embeddingCoverage: total > 0 ? withEmbeddings / total : 0,
      sentimentDistribution: sentimentDist,
      topUsedContexts: mostUsedAsContext,
    };
  }
}
