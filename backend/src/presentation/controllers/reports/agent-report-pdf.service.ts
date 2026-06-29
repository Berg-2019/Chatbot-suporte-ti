import { Injectable } from '@nestjs/common';
import type { AgentReportData } from './agent-report.service';
import type { AgentAnalysis } from './report-ai.service';

// pdfmake server-side: fontes Roboto vêm do vfs (base64) como Buffer.
// O formato do vfs_fonts varia entre versões (.pdfMake.vfs | .vfs | módulo raiz).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vfsModule = require('pdfmake/build/vfs_fonts.js');
const vfs: Record<string, string> = vfsModule.pdfMake?.vfs || vfsModule.vfs || vfsModule;

const BLUE = '#1F93FF';
const DARK = '#0f172a';
const MUTED = '#64748b';

function fmtMin(n: number): string {
  if (!n) return '—';
  if (n < 60) return `${n}min`;
  const h = Math.floor(n / 60);
  const r = n % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

export interface AgentReportBundle {
  data: AgentReportData;
  analysis: AgentAnalysis;
}

@Injectable()
export class AgentReportPdfService {
  private printer = new PdfPrinter({
    Roboto: {
      normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
      bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
      italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
      bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
    },
  });

  async buildAgentPdf(bundle: AgentReportBundle): Promise<Buffer> {
    const doc: any = {
      pageMargins: [40, 56, 40, 48],
      defaultStyle: { font: 'Roboto', fontSize: 10, color: DARK },
      styles: this.styles(),
      footer: this.footer(),
      content: [this.titleBlock(bundle.data), ...this.agentSection(bundle)],
    };
    return this.render(doc);
  }

  async buildConsolidatedPdf(bundles: AgentReportBundle[], sectorLabel: string, period: { start: Date; end: Date }): Promise<Buffer> {
    const summaryRows = [
      [
        { text: 'Agente', style: 'th' },
        { text: 'Resolvidos', style: 'th', alignment: 'center' },
        { text: '% SLA', style: 'th', alignment: 'center' },
        { text: 'CSAT', style: 'th', alignment: 'center' },
        { text: 'Tempo médio', style: 'th', alignment: 'center' },
      ],
      ...bundles.map((b) => [
        b.data.agent.name,
        { text: String(b.data.volume.resolved), alignment: 'center' },
        { text: b.data.sla.compliance == null ? '—' : `${b.data.sla.compliance}%`, alignment: 'center' },
        { text: b.data.csat.average == null ? '—' : String(b.data.csat.average), alignment: 'center' },
        { text: fmtMin(b.data.times.avgResolutionMinutes), alignment: 'center' },
      ]),
    ];

    const content: any[] = [
      { text: 'Relatório de Desempenho — Consolidado', style: 'title' },
      {
        text: `Setor ${sectorLabel} · período ${fmtDate(period.start)} a ${fmtDate(period.end)} · ${bundles.length} agente(s)`,
        style: 'subtitle',
        margin: [0, 0, 0, 14],
      },
      {
        table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body: summaryRows },
        layout: this.tableLayout(),
      },
    ];

    bundles.forEach((b) => {
      content.push({ text: '', pageBreak: 'after' });
      content.push(this.titleBlock(b.data));
      content.push(...this.agentSection(b));
    });

    const doc: any = {
      pageMargins: [40, 56, 40, 48],
      defaultStyle: { font: 'Roboto', fontSize: 10, color: DARK },
      styles: this.styles(),
      footer: this.footer(),
      content,
    };
    return this.render(doc);
  }

  // ---- blocos ----

  private titleBlock(d: AgentReportData): any {
    return {
      stack: [
        { text: 'Relatório de Desempenho do Agente', style: 'title' },
        {
          text: `${d.agent.name} · nível ${d.agent.level} · setor ${d.agent.sector ?? '—'}`,
          style: 'subtitle',
        },
        {
          text: `Período: ${fmtDate(d.period.start)} a ${fmtDate(d.period.end)}`,
          style: 'subtitle',
          margin: [0, 0, 0, 12],
        },
      ],
    };
  }

  private agentSection(bundle: AgentReportBundle): any[] {
    const { data: d, analysis } = bundle;

    const summary = [
      ['Atendimentos resolvidos', String(d.volume.resolved)],
      ['Chamados criados/atribuídos', String(d.volume.created)],
      ['Em andamento (agora)', String(d.volume.inProgress)],
      ['Tempo médio de resolução', fmtMin(d.times.avgResolutionMinutes)],
      ['Tempo médio trabalhado', fmtMin(d.times.avgTimeWorkedMinutes)],
      [
        'SLA cumprido',
        d.sla.compliance == null
          ? 'Sem SLA monitorado'
          : `${d.sla.compliance}% (${d.sla.met}/${d.sla.tracked} · ${d.sla.resolutionBreaches} violações)`,
      ],
      [
        'CSAT médio',
        d.csat.average == null ? 'Sem avaliações' : `${d.csat.average} / 5 (${d.csat.count} avaliações)`,
      ],
    ];

    const out: any[] = [
      this.sectionTitle('Resumo'),
      {
        table: {
          widths: ['*', 'auto'],
          body: summary.map(([k, v]) => [
            { text: k, color: MUTED },
            { text: v, bold: true, alignment: 'right' },
          ]),
        },
        layout: this.tableLayout(),
        margin: [0, 0, 0, 12],
      },
    ];

    // Distribuições
    out.push(this.sectionTitle('Distribuição dos atendimentos'));
    out.push({
      columns: [
        this.distTable('Por prioridade', d.distribution.byPriority),
        this.distTable('Por categoria', d.distribution.byCategory),
      ],
      columnGap: 12,
      margin: [0, 0, 0, 8],
    });
    out.push({
      columns: [
        this.distTable('Por tipo', d.distribution.byType),
        this.csatDistTable(d.csat.distribution),
      ],
      columnGap: 12,
      margin: [0, 0, 0, 12],
    });

    // Comentários CSAT
    if (d.csat.comments.length) {
      out.push(this.sectionTitle('Comentários dos clientes'));
      out.push({
        ul: d.csat.comments
          .slice(0, 15)
          .map((c) => ({ text: [{ text: `(${c.rating}/5) `, bold: true, color: BLUE }, c.feedback] })),
        margin: [0, 0, 0, 12],
      });
    }

    // Análise comportamental (IA)
    out.push(this.sectionTitle('Análise comportamental'));
    if (analysis.generated) {
      if (analysis.pontosPositivos.length) {
        out.push({ text: 'Pontos positivos', bold: true, margin: [0, 2, 0, 2] });
        out.push({ ul: analysis.pontosPositivos, margin: [0, 0, 0, 6] });
      }
      if (analysis.pontosAtencao.length) {
        out.push({ text: 'Pontos de atenção', bold: true, margin: [0, 2, 0, 2] });
        out.push({ ul: analysis.pontosAtencao, margin: [0, 0, 0, 6] });
      }
      out.push({ text: 'Dica de crescimento', bold: true, margin: [0, 2, 0, 2] });
      out.push({ text: analysis.dicaCrescimento || '—' });
    } else {
      out.push({ text: analysis.dicaCrescimento, italics: true, color: MUTED });
    }

    return out;
  }

  private distTable(title: string, rows: { name: string; value: number }[]): any {
    const body =
      rows.length > 0
        ? rows.slice(0, 8).map((r) => [r.name, { text: String(r.value), alignment: 'right' }])
        : [[{ text: 'Sem dados', color: MUTED, colSpan: 2 }, {}]];
    return {
      width: '*',
      stack: [
        { text: title, bold: true, fontSize: 9, color: MUTED, margin: [0, 0, 0, 3] },
        { table: { widths: ['*', 'auto'], body }, layout: this.tableLayout() },
      ],
    };
  }

  private csatDistTable(dist: Record<number, number>): any {
    return {
      width: '*',
      stack: [
        { text: 'CSAT (1→5)', bold: true, fontSize: 9, color: MUTED, margin: [0, 0, 0, 3] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [5, 4, 3, 2, 1].map((s) => [`${s} ★`, { text: String(dist[s] || 0), alignment: 'right' }]),
          },
          layout: this.tableLayout(),
        },
      ],
    };
  }

  private sectionTitle(text: string): any {
    return { text, style: 'section' };
  }

  private styles(): any {
    return {
      title: { fontSize: 16, bold: true, color: DARK },
      subtitle: { fontSize: 9, color: MUTED },
      section: { fontSize: 12, bold: true, color: BLUE, margin: [0, 8, 0, 6] },
      th: { bold: true, fontSize: 9, color: '#ffffff', fillColor: BLUE },
    };
  }

  private tableLayout(): any {
    return {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e2e8f0',
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 6,
      paddingRight: () => 6,
    };
  }

  private footer(): any {
    return (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'Helpdesk MSM', fontSize: 8, color: MUTED, margin: [40, 0, 0, 0] },
        { text: `${currentPage}/${pageCount}`, alignment: 'right', fontSize: 8, color: MUTED, margin: [0, 0, 40, 0] },
      ],
      margin: [0, 16, 0, 0],
    });
  }

  private render(doc: any): Promise<Buffer> {
    const pdfDoc = this.printer.createPdfKitDocument(doc);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (c: Buffer) => chunks.push(c));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}
