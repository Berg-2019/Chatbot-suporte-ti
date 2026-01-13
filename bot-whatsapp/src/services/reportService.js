/**
 * Serviço de Relatórios
 * Gera relatórios semanais e mensais de desempenho
 * 
 * @author Sistema de Atendimento Técnico
 */

import { database } from "./database.js";
import { formatDate } from "../utils/index.js";

/**
 * Classe de geração de relatórios
 */
class ReportService {
  /**
   * Gera relatório semanal
   */
  async generateWeeklyReport() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const stats = await database.getStats(
      startDate.toISOString(),
      endDate.toISOString()
    );

    return this.formatReport("SEMANAL", startDate, endDate, stats);
  }

  /**
   * Gera relatório mensal
   */
  async generateMonthlyReport() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    const stats = await database.getStats(
      startDate.toISOString(),
      endDate.toISOString()
    );

    // Obter estatísticas do mês anterior para comparação
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(startDate);
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);

    const prevStats = await database.getStats(
      prevStartDate.toISOString(),
      prevEndDate.toISOString()
    );

    return this.formatReport("MENSAL", startDate, endDate, stats, prevStats);
  }

  /**
   * Formata o relatório
   */
  formatReport(tipo, startDate, endDate, stats, prevStats = null) {
    const finalizadas = stats.porStatus.finalizada || 0;
    const abertasNovas = stats.porStatus.aberta || 0;
    const emAndamento = stats.porStatus.em_andamento || 0;
    const escaladas = stats.porStatus.escalada || 0;
    const canceladas = stats.porStatus.cancelada || 0;

    const taxaResolucao = stats.total > 0 
      ? ((finalizadas / stats.total) * 100).toFixed(1) 
      : 0;

    const tempoMedioResolucao = this.formatTime(stats.tempoMedioResolucaoMinutos);
    const tempoMedioPrimeiroContato = this.formatTime(stats.tempoMedioPrimeiroContatoMinutos);

    let report = `📊 *RELATÓRIO ${tipo} - SUPORTE TI*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 *Período:* ${formatDate(startDate)} a ${formatDate(endDate)}

📈 *RESUMO GERAL*
• Total de chamados: *${stats.total}*
• Finalizados: ${finalizadas} ✅
• Em andamento: ${emAndamento} 🟡
• Aguardando: ${abertasNovas} 🔵
• Escalados: ${escaladas} 🔴
• Cancelados: ${canceladas} ⚫
• Taxa de resolução: *${taxaResolucao}%*`;

    // Comparativo com período anterior (apenas mensal)
    if (prevStats && tipo === "MENSAL") {
      const variacao = stats.total - prevStats.total;
      const variacaoPercent = prevStats.total > 0 
        ? ((variacao / prevStats.total) * 100).toFixed(1)
        : 0;
      const emoji = variacao > 0 ? "📈" : variacao < 0 ? "📉" : "➡️";

      report += `

📊 *COMPARATIVO MÊS ANTERIOR*
• Mês anterior: ${prevStats.total} chamados
• Variação: ${emoji} ${variacao > 0 ? "+" : ""}${variacao} (${variacaoPercent}%)`;
    }

    report += `

⏱️ *TEMPOS*
• Tempo médio de resposta: *${tempoMedioPrimeiroContato}*
• Tempo médio de resolução: *${tempoMedioResolucao}*`;

    // Chamados por setor
    if (stats.porSetor.length > 0) {
      report += `

🏢 *POR SETOR*`;
      for (const setor of stats.porSetor.slice(0, 8)) {
        const percent = ((setor.count / stats.total) * 100).toFixed(0);
        const bar = this.createBar(percent);
        report += `\n• ${setor.setor}: ${setor.count} (${percent}%) ${bar}`;
      }
    }

    // Chamados por tipo
    if (stats.porTipo.length > 0) {
      report += `

🔧 *POR TIPO DE CHAMADO*`;
      for (const tipo of stats.porTipo.slice(0, 5)) {
        report += `\n• ${tipo.tipo_chamado || "Não especificado"}: ${tipo.count}`;
      }
    }

    // Top técnicos
    if (stats.topTecnicos.length > 0) {
      report += `

👨‍💻 *TOP TÉCNICOS*`;
      let pos = 1;
      for (const t of stats.topTecnicos) {
        const medal = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `${pos}.`;
        report += `\n${medal} ${t.tecnico_responsavel} - ${t.count} atendimentos`;
        pos++;
      }
    }

    // Indicadores de performance
    const escaladasPercent = stats.total > 0 
      ? ((escaladas / stats.total) * 100).toFixed(1) 
      : 0;

    report += `

📋 *INDICADORES*
• Taxa de escalação: ${escaladasPercent}%
• Chamados/dia: ${(stats.total / 7).toFixed(1)}`;

    // Insights automáticos
    const insights = this.generateInsights(stats, prevStats);
    if (insights.length > 0) {
      report += `

💡 *INSIGHTS*`;
      for (const insight of insights) {
        report += `\n${insight}`;
      }
    }

    report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Relatório gerado em ${new Date().toLocaleString("pt-BR")}_`;

    return report;
  }

  /**
   * Formata tempo em minutos para formato legível
   */
  formatTime(minutes) {
    if (!minutes || minutes <= 0) return "N/A";
    
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}min`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  }

  /**
   * Cria barra de progresso simples
   */
  createBar(percent) {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return "▓".repeat(filled) + "░".repeat(empty);
  }

  /**
   * Gera insights automáticos baseados nos dados
   */
  generateInsights(stats, prevStats = null) {
    const insights = [];

    // Taxa de resolução
    const finalizadas = stats.porStatus.finalizada || 0;
    const taxaResolucao = stats.total > 0 
      ? (finalizadas / stats.total) * 100 
      : 0;

    if (taxaResolucao >= 80) {
      insights.push("✅ Excelente taxa de resolução!");
    } else if (taxaResolucao < 50) {
      insights.push("⚠️ Taxa de resolução baixa. Avaliar gargalos.");
    }

    // Tempo de primeiro contato
    if (stats.tempoMedioPrimeiroContatoMinutos > 60) {
      insights.push("⏰ Tempo de resposta alto. Considere mais técnicos de plantão.");
    } else if (stats.tempoMedioPrimeiroContatoMinutos <= 15) {
      insights.push("⚡ Ótimo tempo de resposta!");
    }

    // Taxa de escalação
    const escaladas = stats.porStatus.escalada || 0;
    if (stats.total > 0 && (escaladas / stats.total) > 0.2) {
      insights.push("📈 Alta taxa de escalação. Revisar capacitação nível 1.");
    }

    // Setor com mais chamados
    if (stats.porSetor.length > 0) {
      const topSetor = stats.porSetor[0];
      if (topSetor.count > stats.total * 0.3) {
        insights.push(`🏢 ${topSetor.setor} concentra ${((topSetor.count / stats.total) * 100).toFixed(0)}% dos chamados.`);
      }
    }

    // Comparativo mensal
    if (prevStats) {
      const variacao = stats.total - prevStats.total;
      const variacaoPercent = prevStats.total > 0 
        ? (variacao / prevStats.total) * 100 
        : 0;

      if (variacaoPercent > 20) {
        insights.push(`📈 Aumento de ${variacaoPercent.toFixed(0)}% vs mês anterior.`);
      } else if (variacaoPercent < -20) {
        insights.push(`📉 Redução de ${Math.abs(variacaoPercent).toFixed(0)}% vs mês anterior.`);
      }
    }

    return insights.slice(0, 4); // Limitar a 4 insights
  }

  /**
   * Gera relatório simplificado para envio rápido
   */
  async generateQuickStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await database.getStats(
      today.toISOString(),
      new Date().toISOString()
    );

    return `📊 *STATUS DO DIA*

• Novos chamados: ${stats.porStatus.aberta || 0}
• Em atendimento: ${stats.porStatus.em_andamento || 0}
• Finalizados: ${stats.porStatus.finalizada || 0}
• Escalados: ${stats.porStatus.escalada || 0}

_Atualizado: ${new Date().toLocaleTimeString("pt-BR")}_`;
  }
}

export const reportService = new ReportService();
