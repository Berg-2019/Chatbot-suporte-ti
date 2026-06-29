import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { AgentReportData } from './agent-report.service';

export interface AgentAnalysis {
  pontosPositivos: string[];
  pontosAtencao: string[];
  dicaCrescimento: string;
  generated: boolean;
}

/**
 * Gera a análise comportamental do agente (seca e profissional) a partir das
 * métricas + comentários de CSAT. Provider selecionável por REPORT_AI_PROVIDER
 * (minimax por padrão; glm plugável). Fallback gracioso sem chave/erro.
 */
@Injectable()
export class ReportAiService {
  private readonly logger = new Logger(ReportAiService.name);
  private readonly provider = (process.env.REPORT_AI_PROVIDER || 'minimax').toLowerCase();

  // MiniMax (mesmo provider do bot)
  private readonly minimaxKey = process.env.MINIMAX_API_KEY || '';
  private readonly minimaxUrl = 'https://api.minimax.io/v1/text/chatcompletion_v2';
  private readonly minimaxModel = 'MiniMax-M2';

  // GLM-4 (Zhipu BigModel) — opcional, plugável
  private readonly glmKey = process.env.GLM_API_KEY || '';
  private readonly glmUrl =
    process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  private readonly glmModel = process.env.GLM_MODEL || 'glm-4-flash';

  async analyze(data: AgentReportData): Promise<AgentAnalysis> {
    const messages = [
      { role: 'system', content: this.systemPrompt() },
      { role: 'user', content: this.userPrompt(data) },
    ];

    try {
      const raw = await this.complete(messages);
      const parsed = this.parse(raw);
      if (parsed) return { ...parsed, generated: true };
    } catch (err: any) {
      this.logger.warn(`Análise IA indisponível: ${err?.message || err}`);
    }
    return this.fallback();
  }

  private systemPrompt(): string {
    return [
      'Você é um analista de operações de suporte técnico.',
      'Receberá métricas de desempenho de um agente em um período.',
      'Escreva uma análise SECA e PROFISSIONAL, sem floreios e sem elogios genéricos,',
      'focada apenas no lado profissional do desempenho.',
      'Responda APENAS com JSON válido, sem markdown, no formato:',
      '{"pontosPositivos": string[], "pontosAtencao": string[], "dicaCrescimento": string}.',
      'No máximo 4 itens por lista, frases curtas e objetivas em português.',
      'Baseie-se SOMENTE nos dados fornecidos; não invente números nem fatos.',
    ].join(' ');
  }

  private userPrompt(d: AgentReportData): string {
    const fmt = (n: number) => (n >= 60 ? `${Math.floor(n / 60)}h${n % 60}min` : `${n}min`);
    const dist = (arr: { name: string; value: number }[]) =>
      arr
        .slice(0, 5)
        .map((x) => `${x.name}: ${x.value}`)
        .join(', ') || '—';
    const comments =
      d.csat.comments
        .slice(0, 8)
        .map((c) => `(${c.rating}/5) ${c.feedback}`)
        .join(' | ') || 'nenhum';

    return [
      `Agente: ${d.agent.name} (nível ${d.agent.level}, setor ${d.agent.sector ?? '—'}).`,
      `Período: ${d.period.start.toISOString().slice(0, 10)} a ${d.period.end.toISOString().slice(0, 10)}.`,
      `Atendimentos resolvidos: ${d.volume.resolved}; criados/atribuídos: ${d.volume.created}; em andamento: ${d.volume.inProgress}.`,
      `Tempo médio de resolução: ${fmt(d.times.avgResolutionMinutes)}; tempo médio trabalhado: ${fmt(d.times.avgTimeWorkedMinutes)}.`,
      `SLA cumprido: ${d.sla.compliance ?? '—'}% (monitorados: ${d.sla.tracked}, violações de resolução: ${d.sla.resolutionBreaches}).`,
      `CSAT médio: ${d.csat.average ?? '—'} de ${d.csat.count} avaliações. Distribuição 1→5: ${[1, 2, 3, 4, 5].map((s) => d.csat.distribution[s]).join('/')}.`,
      `Por prioridade: ${dist(d.distribution.byPriority)}.`,
      `Por categoria: ${dist(d.distribution.byCategory)}.`,
      `Comentários dos clientes: ${comments}.`,
    ].join('\n');
  }

  private async complete(messages: { role: string; content: string }[]): Promise<string> {
    if (this.provider === 'glm') {
      if (!this.glmKey) throw new Error('GLM_API_KEY ausente');
      const res = await axios.post(
        this.glmUrl,
        { model: this.glmModel, messages, temperature: 0.3, max_tokens: 600 },
        { headers: { Authorization: `Bearer ${this.glmKey}` }, timeout: 20000 },
      );
      return res.data?.choices?.[0]?.message?.content?.trim() || '';
    }

    // MiniMax (default)
    if (!this.minimaxKey) throw new Error('MINIMAX_API_KEY ausente');
    const res = await axios.post(
      this.minimaxUrl,
      { model: this.minimaxModel, messages, temperature: 0.3, top_p: 0.9, max_tokens: 600 },
      {
        headers: { Authorization: `Bearer ${this.minimaxKey}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      },
    );
    if (res.data?.base_resp?.status_code !== 0) {
      throw new Error(res.data?.base_resp?.status_msg || 'MiniMax error');
    }
    return res.data?.choices?.[0]?.message?.content?.trim() || '';
  }

  private parse(raw: string): Omit<AgentAnalysis, 'generated'> | null {
    if (!raw) return null;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const obj = JSON.parse(match[0]);
      return {
        pontosPositivos: Array.isArray(obj.pontosPositivos) ? obj.pontosPositivos.slice(0, 4) : [],
        pontosAtencao: Array.isArray(obj.pontosAtencao) ? obj.pontosAtencao.slice(0, 4) : [],
        dicaCrescimento: typeof obj.dicaCrescimento === 'string' ? obj.dicaCrescimento : '',
      };
    } catch {
      return null;
    }
  }

  private fallback(): AgentAnalysis {
    return {
      pontosPositivos: [],
      pontosAtencao: [],
      dicaCrescimento:
        'Análise automática indisponível no momento. Avalie os indicadores acima manualmente.',
      generated: false,
    };
  }
}
