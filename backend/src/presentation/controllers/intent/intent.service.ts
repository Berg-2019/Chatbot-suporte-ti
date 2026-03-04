/**
 * Intent Detection Service
 * Classifica intenções de mensagens usando LLM local via Ollama (GLM, Qwen, Llama, etc.)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import axios from 'axios';

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
  private ollamaUrl: string;
  private ollamaModel: string;
  private anthropicApiKey: string;
  private enabled: boolean = false;

  constructor(private prisma: PrismaService) {
    // Configuração Ollama (local ou remoto)
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b'; // ou 'chatglm3:6b', 'llama3.2:3b'
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

    // Verificar se Ollama está disponível
    this.checkOllamaAvailability();
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
      let usedProvider = 'ollama';
      let usedModel = this.ollamaModel;

      if (this.enabled) {
        try {
          result = await this.classifyWithOllama(userMessage);
        } catch (error) {
          this.logger.warn(`Ollama falhou, tentando fallback para Claude...`);
          if (this.anthropicApiKey) {
            result = await this.classifyWithClaude(userMessage);
            usedProvider = 'anthropic';
            usedModel = 'claude-3-haiku-20240307';
          } else {
            throw error;
          }
        }
      } else if (this.anthropicApiKey) {
        this.logger.log(`Ollama desabilitado, usando Claude como fallback...`);
        result = await this.classifyWithClaude(userMessage);
        usedProvider = 'anthropic';
        usedModel = 'claude-3-haiku-20240307';
      } else {
        this.logger.warn('Intent Detection não disponível (Ollama offline e sem API Key do Claude)');
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
    return `Você é um classificador de intenções para um sistema de helpdesk de TI.

Analise a mensagem do usuário e classifique em UMA das intenções abaixo:

**Intenções disponíveis:**
- abrir_ticket_ti: Problemas com computador, rede, sistema, software, impressora, internet
- abrir_ticket_eletrica: Problemas elétricos, ar-condicionado, iluminação, tomadas
- reservar_equipamento: Quer reservar notebook, projetor, cabo, adaptador
- consultar_faq: Pergunta genérica que pode estar na FAQ (como fazer X, o que é Y)
- consultar_ticket: Quer saber status de um ticket/chamado existente
- falar_tecnico: Quer falar com uma pessoa, atendimento humano
- avaliar_atendimento: Quer avaliar o atendimento, dar nota, feedback
- saudacao: Apenas cumprimentando (oi, olá, bom dia)
- outro: Não se encaixa em nenhuma categoria acima

**Mensagem do usuário:**
"${userMessage}"

**IMPORTANTE:**
1. Responda APENAS com JSON válido
2. Não adicione explicações ou texto extra antes ou depois do JSON
3. Use o formato exato abaixo

**Formato de resposta (JSON):**
{
  "intent": "nome_da_intencao",
  "confidence": 0.95,
  "entities": {
    "equipamento": "impressora",
    "problema": "não imprime",
    "setor": "RH"
  }
}

Se não houver entidades relevantes, use entities vazio: "entities": {}`;
  }

  /**
   * Classifica usando Anthropic Claude via API
   */
  private async classifyWithClaude(userMessage: string): Promise<Omit<ClassificationResult, 'processingTime'>> {
    const prompt = this.getPrompt(userMessage);

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          timeout: 15000
        }
      );

      const responseText = response.data.content[0].text.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
         this.logger.error(`Claude não retornou JSON válido: ${responseText}`);
         throw new Error('Resposta inválida do Claude');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      const validIntents = Object.values(Intent);
      if (!validIntents.includes(parsed.intent)) {
        this.logger.warn(`Intenção inválida do Claude: ${parsed.intent}`);
        parsed.intent = Intent.OTHER;
      }

      return {
        intent: parsed.intent || Intent.OTHER,
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {},
      };
    } catch (error: any) {
      this.logger.error(`Claude fallback failed: ${error.message}`);
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
