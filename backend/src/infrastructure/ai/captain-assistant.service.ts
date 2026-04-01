/**
 * Captain Assistant Service
 *
 * Sistema de auto-resposta inteligente inspirado no Chatwoot Captain AI
 *
 * Funcionalidades:
 * - Auto-resposta para problemas tier-1
 * - Usa RAG (conversas anteriores) + Knowledge Base
 * - Detecta quando escalar para humano
 * - Aprende com feedbacks
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RAGService } from './rag.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import axios from 'axios';

export interface CaptainResponse {
  canAutoResolve: boolean; // Se pode resolver automaticamente
  suggestedResponse: string; // Resposta sugerida
  confidence: number; // Confiança (0-1)
  knowledgeSources: string[]; // IDs de fontes usadas
  reasoning: string; // Explicação do raciocínio
  needsHumanReview: boolean; // Se precisa revisão humana
}

@Injectable()
export class CaptainAssistantService {
  private readonly logger = new Logger(CaptainAssistantService.name);
  private minimaxApiKey: string;
  private openaiApiKey: string;
  private anthropicApiKey: string;

  constructor(
    private prisma: PrismaService,
    private ragService: RAGService,
    private knowledgeBase: KnowledgeBaseService,
  ) {
    this.minimaxApiKey = process.env.MINIMAX_API_KEY || '';
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
  }

  /**
   * Tenta resolver problema automaticamente
   */
  async attemptAutoResolve(
    userMessage: string,
    phoneNumber: string,
    intent: string,
  ): Promise<CaptainResponse> {
    this.logger.log(`🤖 Captain tentando resolver: "${userMessage.substring(0, 50)}..."`);

    try {
      // 1. Buscar contexto de conversas similares (RAG)
      const ragContext = await this.ragService.generateContext(userMessage);

      // 2. Buscar conhecimento técnico relevante
      const knowledgeContext = await this.knowledgeBase.generateEnrichedContext(userMessage);

      // 3. Combinar contextos
      const fullContext = [ragContext, knowledgeContext].filter(c => c.length > 0).join('\n\n');

      // 4. Gerar resposta usando LLM
      const llmResponse = await this.generateResponse(userMessage, fullContext, intent);

      // 5. Avaliar se pode resolver automaticamente
      const canAutoResolve = this.shouldAutoResolve(llmResponse, intent);

      // 6. Salvar tentativa para analytics
      await this.logAttempt(phoneNumber, userMessage, llmResponse, canAutoResolve);

      return llmResponse;
    } catch (error: any) {
      this.logger.error(`❌ Erro no Captain Assistant: ${error.message}`);
      return {
        canAutoResolve: false,
        suggestedResponse: '',
        confidence: 0,
        knowledgeSources: [],
        reasoning: `Erro: ${error.message}`,
        needsHumanReview: true,
      };
    }
  }

  /**
   * Gera resposta usando LLM com contexto RAG + Knowledge Base
   */
  private async generateResponse(
    userMessage: string,
    context: string,
    intent: string,
  ): Promise<CaptainResponse> {
    const prompt = this.buildPrompt(userMessage, context, intent);

    // Tentar MiniMax primeiro
    if (this.minimaxApiKey) {
      try {
        return await this.generateWithMinimax(prompt);
      } catch (error: any) {
        this.logger.warn(`MiniMax falhou, tentando Claude: ${error.message}`);
      }
    }

    // Fallback para Claude (melhor para raciocínio complexo)
    if (this.anthropicApiKey) {
      try {
        return await this.generateWithClaude(prompt);
      } catch (error: any) {
        this.logger.warn(`Claude falhou, tentando OpenAI: ${error.message}`);
      }
    }

    // Fallback para OpenAI
    if (this.openaiApiKey) {
      try {
        return await this.generateWithOpenAI(prompt);
      } catch (error: any) {
        this.logger.error(`OpenAI falhou: ${error.message}`);
      }
    }

    throw new Error('Nenhum provider de IA disponível');
  }

  /**
   * Gera prompt otimizado para Captain Assistant
   */
  private buildPrompt(userMessage: string, context: string, intent: string): string {
    return `Você é o Captain Assistant, um assistente de suporte técnico inteligente.

**Contexto Disponível:**
${context || 'Nenhum contexto relevante encontrado'}

**Mensagem do Usuário:**
"${userMessage}"

**Intent Detectado:** ${intent}

**Tarefa:**
Analise o problema e forneça uma resposta em JSON no seguinte formato:

{
  "canAutoResolve": boolean,  // true se pode resolver sem técnico humano
  "suggestedResponse": "string",  // Resposta para enviar ao usuário
  "confidence": 0.0-1.0,  // Confiança na solução
  "knowledgeSources": ["ids"],  // IDs de conhecimento usado
  "reasoning": "string",  // Explicação do raciocínio
  "needsHumanReview": boolean  // true se precisa revisão humana
}

**Regras:**
1. Se confiança < 0.7 ou problema complexo → canAutoResolve = false
2. Resposta deve ser clara, em português brasileiro, com emojis
3. Incluir passos específicos se for tutorial
4. Se não souber, seja honesto e escale para humano
5. Cite fontes quando usar conhecimento específico

**Responda APENAS com o JSON, sem texto adicional.**`;
  }

  /**
   * Gera resposta usando MiniMax
   */
  private async generateWithMinimax(prompt: string): Promise<CaptainResponse> {
    const response = await axios.post(
      'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
      {
        model: 'abab6-chat',
        messages: [
          {
            role: 'system',
            content: 'Assistente técnico que responde em JSON estruturado.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${this.minimaxApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      },
    );

    const responseText = response.data.choices?.[0]?.message?.content?.trim();
    return this.parseResponse(responseText);
  }

  /**
   * Gera resposta usando Claude (Anthropic)
   */
  private async generateWithClaude(prompt: string): Promise<CaptainResponse> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        timeout: 30000,
      },
    );

    const responseText = response.data.content[0].text;
    return this.parseResponse(responseText);
  }

  /**
   * Gera resposta usando OpenAI
   */
  private async generateWithOpenAI(prompt: string): Promise<CaptainResponse> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Assistente técnico que responde em JSON estruturado.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      },
    );

    const responseText = response.data.choices[0].message.content;
    return this.parseResponse(responseText);
  }

  /**
   * Parse resposta JSON do LLM
   */
  private parseResponse(responseText: string): CaptainResponse {
    // Extrair JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error(`Resposta não contém JSON válido: ${responseText}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validar campos obrigatórios
    if (
      typeof parsed.canAutoResolve !== 'boolean' ||
      typeof parsed.suggestedResponse !== 'string' ||
      typeof parsed.confidence !== 'number'
    ) {
      throw new Error('Resposta JSON inválida: campos obrigatórios ausentes');
    }

    return {
      canAutoResolve: parsed.canAutoResolve,
      suggestedResponse: parsed.suggestedResponse,
      confidence: parsed.confidence,
      knowledgeSources: parsed.knowledgeSources || [],
      reasoning: parsed.reasoning || '',
      needsHumanReview: parsed.needsHumanReview ?? !parsed.canAutoResolve,
    };
  }

  /**
   * Decide se deve resolver automaticamente
   */
  private shouldAutoResolve(response: CaptainResponse, intent: string): boolean {
    // Nunca auto-resolver se confiança baixa
    if (response.confidence < 0.7) {
      return false;
    }

    // Alguns intents nunca devem ser auto-resolvidos
    const noAutoResolveIntents = [
      'falar_tecnico',
      'abrir_ticket_eletrica', // Problemas elétricos requerem técnico
    ];

    if (noAutoResolveIntents.includes(intent)) {
      return false;
    }

    // Se LLM marcou como necessitando revisão humana
    if (response.needsHumanReview) {
      return false;
    }

    return response.canAutoResolve;
  }

  /**
   * Registra tentativa para analytics
   */
  private async logAttempt(
    phoneNumber: string,
    userMessage: string,
    response: CaptainResponse,
    resolved: boolean,
  ): Promise<void> {
    try {
      // Criar log no banco de dados (você pode criar uma tabela específica)
      // Por enquanto, usar console
      this.logger.log(
        `📊 Captain ${resolved ? 'RESOLVEU' : 'ESCALOU'}: ${phoneNumber} - Confidence: ${response.confidence}`,
      );

      // TODO: Salvar em tabela CaptainAttempt para analytics
    } catch (error: any) {
      this.logger.warn(`Erro ao logar tentativa: ${error.message}`);
    }
  }

  /**
   * Registra feedback sobre resposta do Captain
   */
  async provideFeedback(
    attemptId: string,
    wasHelpful: boolean,
    agentComment?: string,
  ): Promise<void> {
    this.logger.log(`📝 Feedback Captain: ${wasHelpful ? '👍 Útil' : '👎 Não útil'}`);

    // TODO: Atualizar tabela CaptainAttempt com feedback
    // Usar para retreinamento futuro
  }

  /**
   * Estatísticas de performance do Captain
   */
  async getPerformanceStats(startDate?: Date, endDate?: Date): Promise<any> {
    // TODO: Buscar de tabela CaptainAttempt

    return {
      totalAttempts: 0,
      autoResolved: 0,
      escalated: 0,
      avgConfidence: 0,
      successRate: 0,
      avgResolutionTime: 0,
    };
  }
}
