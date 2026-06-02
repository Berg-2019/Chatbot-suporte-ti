import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ConversationMessage {
  role: 'user' | 'bot';
  content: string;
}

interface ConversationResponse {
  text: string;
  extractedEntities?: {
    sector?: string;
    location?: string;
    problemType?: string;
  };
}

@Injectable()
export class ConversationAIService {
  private readonly logger = new Logger(ConversationAIService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.minimax.io/v1/text/chatcompletion_v2';
  private readonly model = 'MiniMax-M2';

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || '';
  }

  async generateResponse(
    userMessage: string,
    history: ConversationMessage[],
    context?: { state: string; missingFields?: string[] },
  ): Promise<ConversationResponse> {
    if (!this.apiKey) {
      return { text: this.fallbackResponse(context) };
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(m => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 250,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      if (response.data.base_resp?.status_code !== 0) {
        throw new Error(response.data.base_resp?.status_msg || 'API error');
      }

      const text = response.data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('Empty response');

      return { text };
    } catch (err: any) {
      this.logger.warn(`MiniMax conversation failed: ${err.message}`);
      return { text: this.fallbackResponse(context) };
    }
  }

  async extractEntities(
    text: string,
  ): Promise<{ sector?: string; location?: string; problemSummary?: string }> {
    if (!this.apiKey) return {};

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `Extraia entidades da mensagem de suporte técnico. Retorne APENAS JSON:
{"sector":"TI|ELECTRIC|null","location":"local ou null","problemSummary":"resumo curto ou null"}
Sem explicações. Apenas o JSON.`,
            },
            { role: 'user', content: text },
          ],
          temperature: 0.1,
          max_tokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      const content = response.data.choices?.[0]?.message?.content?.trim();
      if (!content) return {};

      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return {};

      const parsed = JSON.parse(match[0]);
      return {
        sector: parsed.sector === 'null' ? undefined : parsed.sector,
        location: parsed.location === 'null' ? undefined : parsed.location,
        problemSummary: parsed.problemSummary === 'null' ? undefined : parsed.problemSummary,
      };
    } catch {
      return {};
    }
  }

  async summarizeFaqAnswer(question: string, answer: string): Promise<string> {
    if (!this.apiKey) return answer;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Resuma a resposta FAQ para WhatsApp: curto, direto, sem formatação complexa. Máximo 3 linhas.',
            },
            {
              role: 'user',
              content: `Pergunta: ${question}\nResposta original: ${answer}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      return response.data.choices?.[0]?.message?.content?.trim() || answer;
    } catch {
      return answer;
    }
  }

  private buildSystemPrompt(context?: { state: string; missingFields?: string[] }): string {
    let prompt = `Você é o assistente de suporte técnico do MSM Helpdesk via WhatsApp.

Regras:
- Responda em português brasileiro, tom profissional mas acolhedor
- Seja conciso (máximo 3 linhas)
- Não use emojis em excesso (máximo 1 por mensagem)
- Não invente informações técnicas
- Guie o usuário a descrever seu problema claramente
- Se o problema parece técnico, oriente a abrir um chamado`;

    if (context?.state === 'collect_problem') {
      prompt += '\n\nO usuário precisa descrever o problema. Peça detalhes se a descrição for vaga.';
    }
    if (context?.state === 'collect_location') {
      prompt += '\n\nPrecisamos saber o setor/sala onde o usuário está. Pergunte educadamente.';
    }
    if (context?.missingFields?.length) {
      prompt += `\n\nCampos que faltam coletar: ${context.missingFields.join(', ')}`;
    }

    return prompt;
  }

  private fallbackResponse(context?: { state: string; missingFields?: string[] }): string {
    if (context?.state === 'collect_problem') {
      return 'Pode descrever com mais detalhes o problema que está enfrentando?';
    }
    if (context?.state === 'collect_location') {
      return 'Em qual setor ou sala você está?';
    }
    return 'Como posso te ajudar? Descreva seu problema ou dúvida.';
  }
}
