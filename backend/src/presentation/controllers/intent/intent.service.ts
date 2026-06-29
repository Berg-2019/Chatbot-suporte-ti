/**
 * Intent Detection Service
 * Classifica intenções de mensagens via LLM cloud: MiniMax (primário) → GLM-4 (fallback).
 */

import { Injectable, Logger } from '@nestjs/common';
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
export class IntentService {
  private readonly logger = new Logger(IntentService.name);
  private minimaxApiKey: string; // Provider cloud primário
  private glmApiKey: string; // Provider cloud de fallback
  private enabled: boolean = false;

  constructor(private prisma: PrismaService) {
    this.minimaxApiKey = process.env.MINIMAX_API_KEY || '';
    this.glmApiKey = process.env.GLM_API_KEY || '';
    this.enabled = !!this.minimaxApiKey || !!this.glmApiKey;
  }

  /**
   * Classifica intenção de mensagem do usuário.
   * MiniMax como provider primário; GLM-4 como fallback.
   */
  async classify(userMessage: string, phoneNumber?: string): Promise<ClassificationResult> {
    const startTime = Date.now();

    try {
      let result: Omit<ClassificationResult, 'processingTime'>;
      let usedProvider = 'minimax';
      let usedModel = 'MiniMax-M2';

      if (this.minimaxApiKey) {
        try {
          result = await this.classifyWithMiniMax(userMessage);
        } catch (error) {
          if (this.glmApiKey) {
            this.logger.warn('MiniMax falhou, tentando GLM-4 como fallback...');
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
   * Classifica usando GLM-4 (Zhipu AI) via API — fallback.
   * Modelo: glm-4-flash (rápido e barato) ou glm-4 (mais preciso).
   */
  private async classifyWithGLM(userMessage: string): Promise<Omit<ClassificationResult, 'processingTime'>> {
    const prompt = this.getPrompt(userMessage);

    try {
      const response = await axios.post(
        process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        {
          model: process.env.GLM_MODEL || 'glm-4-flash',
          messages: [
            {
              role: 'system',
              content: 'Você é um classificador de intenções para helpdesk. Responda APENAS com JSON válido, sem explicações adicionais.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${this.glmApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const responseText = response.data.choices[0].message.content.trim();
      if (!responseText) {
        this.logger.error('GLM-4 retornou resposta vazia');
        throw new Error('Resposta vazia do GLM-4');
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error(`GLM-4 não retornou JSON válido: ${responseText}`);
        throw new Error('Resposta inválida do GLM-4');
      }

      const parsed = JSON.parse(jsonMatch[0]);
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
   * Classifica usando MiniMax AI via API — provider primário.
   */
  private async classifyWithMiniMax(userMessage: string): Promise<Omit<ClassificationResult, 'processingTime'>> {
    const prompt = this.getPrompt(userMessage);

    try {
      const response = await axios.post(
        'https://api.minimax.io/v1/text/chatcompletion_v2',
        {
          model: 'MiniMax-M2', // non-reasoning model (M2.5 gasta tokens pensando)
          messages: [
            { role: 'system', content: 'Assistente helpdesk. Retorne apenas JSON compacto.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          top_p: 0.95,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${this.minimaxApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      if (response.data.base_resp && response.data.base_resp.status_code !== 0) {
        this.logger.error(`MiniMax API error: ${response.data.base_resp.status_msg}`);
        throw new Error(`MiniMax API error: ${response.data.base_resp.status_msg}`);
      }

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
      this.logger.error(`MiniMax classification failed: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`MiniMax error details: ${redactPII(JSON.stringify(error.response.data))}`);
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
      this.prisma.intentClassification.count({ where }),
      this.prisma.intentClassification.groupBy({
        by: ['intent'],
        where,
        _count: true,
      }),
      this.prisma.intentClassification.aggregate({
        where,
        _avg: { confidence: true },
      }),
      this.prisma.intentClassification.aggregate({
        where,
        _avg: { processingTime: true },
      }),
    ]);

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
      provider: this.minimaxApiKey ? 'minimax' : this.glmApiKey ? 'glm' : 'none',
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
      provider: this.minimaxApiKey ? 'minimax' : this.glmApiKey ? 'glm' : 'none',
    };
  }
}
