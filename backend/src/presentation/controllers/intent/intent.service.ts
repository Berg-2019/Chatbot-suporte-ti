/**
 * Intent Detection Service
 * Classifica intenções de mensagens usando LLM local via Ollama (GLM, Qwen, Llama, etc.)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import axios from 'axios';
import { redactPII } from '../../../infrastructure/logger/redact';

// Intenções suportadas
export enum Intent {
  OPEN_TICKET_IT = 'abrir_ticket_ti',
  OPEN_TICKET_ELECTRIC = 'abrir_ticket_eletrica',
  RESERVE_EQUIPMENT = 'reservar_equipamento',
  CONSULT_FAQ = 'consultar_faq',
  CONSULT_TICKET = 'consultar_ticket',
  SPEAK_WITH_TECHNICIAN = 'falar_tecnico',
  GREETING = 'saudacao',
  RATING = 'avaliar_atendimento',
  OTHER = 'outro',
}

export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
  processingTime: number;
}

@Injectable()
export class IntentService implements OnModuleInit {
  private readonly logger = new Logger(IntentService.name);
  private ollamaUrl: string;
  private ollamaModel: string;
  private minimaxApiKey: string; // Provider cloud principal
  private glmApiKey: string; // Provider cloud alternativo (quando disponível)
  private enabled: boolean = false;

  constructor(
    private prisma: PrismaService,
  ) {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b'; // ou 'chatglm3:6b', 'llama3.2:3b'

    // MiniMax como fallback cloud principal
    this.minimaxApiKey = process.env.MINIMAX_API_KEY || '';

    // GLM-4 como alternativa cloud (opcional)
    this.glmApiKey = process.env.GLM_API_KEY || '';
  }

  /**
   * Executado após módulo inicializar - verifica Ollama
   */
  async onModuleInit() {
    await this.checkOllamaAvailability();
  }

  /**
   * Verifica se Ollama está rodando
   */
  private async checkOllamaAvailability() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 3000 });

      if (response.status === 200) {
        this.enabled = true;
        const models = response.data.models?.map((m: any) => m.name) || [];
        this.logger.log(`✅ Ollama disponível em ${this.ollamaUrl}`);
        this.logger.log(`📦 Modelos instalados: ${models.join(', ') || 'nenhum'}`);

        if (!models.includes(this.ollamaModel)) {
          this.logger.warn(`⚠️ Modelo ${this.ollamaModel} não encontrado. Execute: ollama pull ${this.ollamaModel}`);
          this.enabled = false;
        }
      }
    } catch (error: any) {
      this.logger.warn(
        `⚠️ Ollama não disponível em ${this.ollamaUrl}. Intent Detection desabilitado.`,
      );
      this.logger.warn(`💡 Para habilitar, instale Ollama: https://ollama.com/download`);
      this.logger.warn(`💡 Depois execute: ollama pull ${this.ollamaModel}`);
      this.enabled = false;
    }
  }

  /**
   * Classifica intenção de mensagem do usuário
   */
  async classify(userMessage: string, phoneNumber?: string): Promise<ClassificationResult> {
    const startTime = Date.now();

    try {
      let result;
      let usedProvider = 'minimax';
      let usedModel = 'MiniMax-M2.5';

      // 🚀 MiniMax como provider PRIMÁRIO (mais humanizado e fluido)
      if (this.minimaxApiKey) {
        try {
          this.logger.log(`🤖 Usando MiniMax (MiniMax-M2.5) como provider primário...`);
          result = await this.classifyWithMiniMax(userMessage);
        } catch (error) {
          this.logger.warn(`MiniMax falhou, tentando Ollama como fallback...`);

          // Fallback para Ollama se disponível
          if (this.enabled) {
            try {
              result = await this.classifyWithOllama(userMessage);
              usedProvider = 'ollama';
              usedModel = this.ollamaModel;
            } catch (ollamaError) {
              this.logger.warn(`Ollama falhou, tentando GLM-4...`);
              if (this.glmApiKey) {
                result = await this.classifyWithGLM(userMessage);
                usedProvider = 'glm';
                usedModel = 'glm-4-flash';
              } else {
                throw error;
              }
            }
          } else if (this.glmApiKey) {
            result = await this.classifyWithGLM(userMessage);
            usedProvider = 'glm';
            usedModel = 'glm-4-flash';
          } else {
            throw error;
          }
        }
      } else if (this.enabled) {
        // Ollama como segunda opção se MiniMax não configurado
        try {
          result = await this.classifyWithOllama(userMessage);
          usedProvider = 'ollama';
          usedModel = this.ollamaModel;
        } catch (error) {
          if (this.glmApiKey) {
            result = await this.classifyWithGLM(userMessage);
            usedProvider = 'glm';
            usedModel = 'glm-4-flash';
          } else {
            throw error;
          }
        }
      } else if (this.glmApiKey) {
        result = await this.classifyWithGLM(userMessage);
        usedProvider = 'glm';
        usedModel = 'glm-4-flash';
      } else {
        this.logger.warn('❌ Intent Detection não disponível (nenhum provider configurado)');
        return {
          intent: Intent.OTHER,
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }

      // Salvar classificação no banco
      await this.prisma.intentClassification.create({
        data: {
          userMessage,
          phoneNumber,
          intent: result.intent,
          confidence: result.confidence,
          entities: result.entities || {},
          provider: usedProvider,
          model: usedModel,
          processingTime: Date.now() - startTime,
        },
      });

      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error(`Erro ao classificar intenção: ${error.message}`);
      return {
        intent: Intent.OTHER,
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  private getPrompt(userMessage: string): string {
    return `Classifique a mensagem:

"${userMessage}"

Intenções:
1. abrir_ticket_ti - Usuário RELATA problema técnico concreto
   ✅ Exemplos: "sem internet", "PC não liga", "impressora quebrou", "sistema lento", "erro"

2. abrir_ticket_eletrica - Usuário RELATA problema elétrico concreto
   ✅ Exemplos: "sem luz", "tomada quebrada", "AC parou"

3. falar_tecnico - APENAS pede falar com alguém, SEM descrever problema
   ✅ Exemplos: "quero falar com técnico" (sem mencionar problema)
   ❌ NÃO use se descreve problema técnico!

4. reservar_equipamento - Quer reservar equipamento
5. consultar_ticket - Quer saber status
6. saudacao - Só cumprimento
7. outro - Nada acima

REGRA CRÍTICA: Menciona problema concreto (internet, PC, erro, etc) = SEMPRE abrir_ticket!

JSON: {"intent":"nome","confidence":0.95,"entities":{}}`;
  }

  /**
   * Classifica usando GLM-4 (Zhipu AI) via API
   * Modelo recomendado: glm-4-flash (rápido e barato) ou glm-4 (mais preciso)
   */
  private async classifyWithGLM(userMessage: string): Promise<Omit<ClassificationResult, 'processingTime'>> {
    const prompt = this.getPrompt(userMessage);

    try {
      const response = await axios.post(
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        {
          model: 'glm-4-flash', // Ou 'glm-4' para mais precisão
          messages: [
            {
              role: 'system',
              content: 'Você é um classificador de intenções para helpdesk. Responda APENAS com JSON válido, sem explicações adicionais.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 200,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.glmApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      // GLM-4 usa formato OpenAI-compatible
      const responseText = response.data.choices[0].message.content.trim();

      if (!responseText) {
        this.logger.error('GLM-4 retornou resposta vazia');
        throw new Error('Resposta vazia do GLM-4');
      }

      // Extrair JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        this.logger.error(`GLM-4 não retornou JSON válido: ${responseText}`);
        throw new Error('Resposta inválida do GLM-4');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validar intenção
      const validIntents = Object.values(Intent);
      if (!validIntents.includes(parsed.intent)) {
        this.logger.warn(`Intenção inválida do GLM-4: ${parsed.intent}`);
        parsed.intent = Intent.OTHER;
      }

      return {
        intent: parsed.intent || Intent.OTHER,
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {},
      };
    } catch (error: any) {
      this.logger.error(`GLM-4 fallback failed: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`GLM-4 error details: ${redactPII(JSON.stringify(error.response.data))}`);
      }
      throw error;
    }
  }

  /**
   * Classifica usando MiniMax AI via API
   * Provider cloud principal (fallback quando Ollama offline)
   */
  private async classifyWithMiniMax(userMessage: string): Promise<Omit<ClassificationResult, 'processingTime'>> {
    const prompt = this.getPrompt(userMessage);

    try {
      // MiniMax agora usa formato OpenAI-compatible
      const response = await axios.post(
        'https://api.minimax.io/v1/text/chatcompletion_v2',
        {
          model: 'MiniMax-M2', // non-reasoning model (M2.5 gasta tokens pensando)
          messages: [
            {
              role: 'system',
              content: 'Assistente helpdesk. Retorne apenas JSON compacto.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          top_p: 0.95,
          max_tokens: 300
        },
        {
          headers: {
            'Authorization': `Bearer ${this.minimaxApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      // Verificar se há erro da API
      if (response.data.base_resp && response.data.base_resp.status_code !== 0) {
        this.logger.error(`MiniMax API error: ${response.data.base_resp.status_msg}`);
        throw new Error(`MiniMax API error: ${response.data.base_resp.status_msg}`);
      }

      // MiniMax retorna no formato OpenAI-compatible agora
      const responseText = response.data.choices?.[0]?.message?.content?.trim() || response.data.reply?.trim();

      if (!responseText) {
        this.logger.error('MiniMax retornou resposta vazia');
        throw new Error('Resposta vazia do MiniMax');
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
         this.logger.error(`MiniMax não retornou JSON válido: ${responseText}`);
         throw new Error('Resposta inválida do MiniMax');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const validIntents = Object.values(Intent);
      if (!validIntents.includes(parsed.intent)) {
        this.logger.warn(`Intenção inválida do MiniMax: ${parsed.intent}`);
        parsed.intent = Intent.OTHER;
      }

      return {
        intent: parsed.intent || Intent.OTHER,
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {},
      };
    } catch (error: any) {
      this.logger.error(`MiniMax fallback failed: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`MiniMax error details: ${redactPII(JSON.stringify(error.response.data))}`);
      }
      throw error;
    }
  }

  private async classifyWithOllama(userMessage: string): Promise<Omit<ClassificationResult, 'processingTime'>> {
    const prompt = this.getPrompt(userMessage);

    try {
      // Chamar API do Ollama
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.3, // Baixa temperatura para respostas mais consistentes
            num_predict: 200, // Limitar tokens de resposta
          },
        },
        { timeout: 30000 }, // 30 segundos timeout
      );

      const responseText = response.data.response.trim();

      // Extrair JSON da resposta (alguns modelos adicionam texto extra)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        this.logger.error(`Ollama não retornou JSON válido: ${responseText}`);
        throw new Error('Resposta inválida do Ollama');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validar intenção
      const validIntents = Object.values(Intent);
      if (!validIntents.includes(parsed.intent)) {
        this.logger.warn(`Intenção inválida retornada: ${parsed.intent}, usando 'outro'`);
        parsed.intent = Intent.OTHER;
      }

      return {
        intent: parsed.intent || Intent.OTHER,
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {},
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        this.logger.error('Ollama não está rodando. Execute: ollama serve');
      }
      throw error;
    }
  }

  /**
   * Busca estatísticas de classificação
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate) {
      where.createdAt = { gte: startDate };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: endDate };
    }

    const [total, byIntent, avgConfidence, avgProcessingTime] = await Promise.all([
      // Total de classificações
      this.prisma.intentClassification.count({ where }),

      // Distribuição por intenção
      this.prisma.intentClassification.groupBy({
        by: ['intent'],
        where,
        _count: true,
      }),

      // Confiança média
      this.prisma.intentClassification.aggregate({
        where,
        _avg: { confidence: true },
      }),

      // Tempo médio de processamento
      this.prisma.intentClassification.aggregate({
        where,
        _avg: { processingTime: true },
      }),
    ]);

    // Distribuição formatada
    const distribution = byIntent.map((item) => ({
      intent: item.intent,
      count: item._count,
      percentage: total > 0 ? ((item._count / total) * 100).toFixed(2) : '0.00',
    }));

    return {
      totalClassifications: total,
      averageConfidence: avgConfidence._avg.confidence || 0,
      averageProcessingTime: avgProcessingTime._avg.processingTime || 0,
      distribution,
      provider: 'ollama',
      model: this.ollamaModel,
      enabled: this.enabled,
    };
  }

  /**
   * Busca classificações recentes
   */
  async getRecentClassifications(limit = 50) {
    return this.prisma.intentClassification.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userMessage: true,
        intent: true,
        confidence: true,
        entities: true,
        processingTime: true,
        provider: true,
        model: true,
        createdAt: true,
      },
    });
  }

  /**
   * Sugestão de resposta baseada na intenção
   * (pode ser usado pelo bot para decidir próximo passo)
   */
  getSuggestedAction(intent: string): string {
    const actions: Record<string, string> = {
      [Intent.OPEN_TICKET_IT]: 'redirect_to_it_flow',
      [Intent.OPEN_TICKET_ELECTRIC]: 'redirect_to_electric_flow',
      [Intent.RESERVE_EQUIPMENT]: 'redirect_to_reservation_flow',
      [Intent.CONSULT_FAQ]: 'search_faq',
      [Intent.CONSULT_TICKET]: 'show_ticket_status',
      [Intent.SPEAK_WITH_TECHNICIAN]: 'transfer_to_agent',
      [Intent.RATING]: 'start_rating_flow',
      [Intent.GREETING]: 'show_menu',
      [Intent.OTHER]: 'show_menu',
    };

    return actions[intent] || 'show_menu';
  }

  /**
   * Retorna status do serviço
   */
  async getStatus() {
    return {
      enabled: this.enabled,
      provider: 'ollama',
      url: this.ollamaUrl,
      model: this.ollamaModel,
    };
  }
}
