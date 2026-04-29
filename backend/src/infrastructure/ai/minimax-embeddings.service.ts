/**
 * MiniMax Embeddings Service
 *
 * Gera embeddings usando MiniMax API (modelo embo-01)
 * Substitui embeddings simples (TF-IDF) por embeddings reais
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

@Injectable()
export class MinimaxEmbeddingsService {
  private readonly logger = new Logger(MinimaxEmbeddingsService.name);
  private apiKey: string;
  private groupId: string;
  private apiUrl = 'https://api.minimax.io/v1/embeddings';
  private model = 'embo-01';

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
    this.groupId = process.env.MINIMAX_GROUP_ID || '';

    if (!this.apiKey) {
      this.logger.warn('⚠️  MINIMAX_API_KEY não configurado - embeddings não disponíveis');
    }

    if (!this.groupId) {
      this.logger.warn('⚠️  MINIMAX_GROUP_ID não configurado - embeddings não disponíveis');
    }
  }

  /**
   * Verifica se serviço está disponível
   */
  isAvailable(): boolean {
    // Token Plan Key (sk-cp-) não cobre embeddings — força fallback p/ TF-IDF
    if (this.apiKey.startsWith('sk-cp-')) return false;
    return !!(this.apiKey && this.groupId);
  }

  /**
   * Gera embedding para um único texto
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.isAvailable()) {
      throw new Error('MiniMax Embeddings não configurado (falta API_KEY ou GROUP_ID)');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          texts: [text],
          type: 'db', // 'db' para armazenar em banco, 'query' para busca
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          params: {
            GroupId: this.groupId,
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      if (!data.vectors || data.vectors.length === 0) {
        throw new Error('API retornou embedding vazio');
      }

      const embedding = data.vectors[0];
      const tokenCount = data.total_tokens || 0;

      this.logger.log(`✅ Embedding gerado: ${embedding.length} dimensões, ${tokenCount} tokens`);

      return {
        embedding,
        model: this.model,
        tokenCount,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao gerar embedding: ${error.message}`);

      if (error.response) {
        this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }

      throw error;
    }
  }

  /**
   * Gera embeddings para múltiplos textos (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.isAvailable()) {
      throw new Error('MiniMax Embeddings não configurado (falta API_KEY ou GROUP_ID)');
    }

    if (texts.length === 0) {
      return [];
    }

    // MiniMax suporta até 10 textos por request
    const batchSize = 10;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await axios.post(
          this.apiUrl,
          {
            model: this.model,
            texts: batch,
            type: 'db',
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            params: {
              GroupId: this.groupId,
            },
            timeout: 30000,
          }
        );

        const data = response.data;

        if (!data.vectors || data.vectors.length !== batch.length) {
          throw new Error(`API retornou ${data.vectors?.length || 0} embeddings, esperado ${batch.length}`);
        }

        const batchResults = data.vectors.map((embedding: number[], idx: number) => ({
          embedding,
          model: this.model,
          tokenCount: Math.floor(data.total_tokens / batch.length), // Estimar tokens por texto
        }));

        results.push(...batchResults);

        this.logger.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} embeddings gerados`);
      } catch (error: any) {
        this.logger.error(`❌ Erro ao gerar batch ${i / batchSize + 1}: ${error.message}`);
        throw error;
      }
    }

    return results;
  }

  /**
   * Gera embedding otimizado para busca/query
   */
  async generateQueryEmbedding(queryText: string): Promise<EmbeddingResult> {
    if (!this.isAvailable()) {
      throw new Error('MiniMax Embeddings não configurado (falta API_KEY ou GROUP_ID)');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          texts: [queryText],
          type: 'query', // Otimizado para busca
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          params: {
            GroupId: this.groupId,
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      if (!data.vectors || data.vectors.length === 0) {
        throw new Error('API retornou embedding vazio');
      }

      const embedding = data.vectors[0];
      const tokenCount = data.total_tokens || 0;

      this.logger.log(`✅ Query embedding gerado: ${embedding.length} dimensões`);

      return {
        embedding,
        model: this.model,
        tokenCount,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao gerar query embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula similaridade de cosseno entre dois embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) {
      return 0;
    }

    return dotProduct / (magA * magB);
  }

  /**
   * Testa conexão e retorna informações do modelo
   */
  async testConnection(): Promise<{
    available: boolean;
    model: string;
    dimensions?: number;
    error?: string;
  }> {
    if (!this.isAvailable()) {
      return {
        available: false,
        model: this.model,
        error: 'API_KEY ou GROUP_ID não configurados',
      };
    }

    try {
      const result = await this.generateEmbedding('teste de conexão');

      return {
        available: true,
        model: this.model,
        dimensions: result.embedding.length,
      };
    } catch (error: any) {
      return {
        available: false,
        model: this.model,
        error: error.message,
      };
    }
  }
}
