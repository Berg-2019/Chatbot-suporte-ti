import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class ReportRecipientsService {
  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
    private metricsService: MetricsService,
  ) { }

  async create(name: string, jid: string) {
    // Check if exists
    const existing = await this.prisma.reportRecipient.findUnique({
      where: { jid },
    });

    if (existing) {
      // Update name if active, or reactivate
      return this.prisma.reportRecipient.update({
        where: { jid },
        data: { name, active: true },
      });
    }

    return this.prisma.reportRecipient.create({
      data: { name, jid },
    });
  }

  async findAll() {
    return this.prisma.reportRecipient.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async sendReport(recipientJid: string, reportData: any, type: string) {
    const formattedMessage = this.formatReportMessage(reportData, type);

    await this.rabbitmq.publishOutgoingMessage({
      to: recipientJid,
      text: formattedMessage,
      ticketId: undefined, // Sistema message
    });

    return { success: true };
  }

  private formatReportMessage(data: any, type: string): string {
    const today = new Date().toLocaleDateString('pt-BR');
    let msg = `📊 *Relatório do Helpdesk*\n📅 ${today}\n\n`;

    if (type === 'tickets' || !type) {
      msg += `📈 *Métricas Gerais*\n`;
      msg += `• Total: ${data.totalTickets}\n`;
      msg += `• Abertos: ${data.openTickets} 🟡\n`;
      msg += `• Fechados: ${data.closedTickets} ✅\n`;
      msg += `• Tempo Médio: ${data.avgResolutionMinutes}min ⏱️\n`;

      const sla = Number(data.slaCompliance);
      const slaIcon = sla >= 90 ? '✅' : sla >= 75 ? '⚠️' : '🚨';
      msg += `• SLA: ${sla}% ${slaIcon}\n\n`;

      if (data.byTechnician && Array.isArray(data.byTechnician)) {
        msg += `👨‍🔧 *Top Técnicos (Fechados)*\n`;
        const sorted = [...data.byTechnician].sort((a, b) => b.closed - a.closed).slice(0, 5);
        sorted.forEach(t => {
          msg += `• ${t.name}: ${t.closed}\n`;
        });
      }
    } else if (type === 'categories') {
      msg += `📊 *Por Categoria*\n`;
      if (data.byCategory) {
        data.byCategory.forEach((c: any) => {
          msg += `• ${c.category}: ${c.count}\n`;
        });
      }
    }

    msg += `\n🤖 _Enviado via MSM Bot_`;
    return msg;
  }

  /**
   * Envia relatório sob demanda (via comando !relatorio no bot)
   */
  async sendAdhocReport(jid: string, technicianName?: string) {
    // 1. Verificar se quem pediu é um "CEO" (está na lista de recipients)
    const recipient = await this.prisma.reportRecipient.findUnique({
      where: { jid },
    });

    if (!recipient || !recipient.active) {
      await this.rabbitmq.publishOutgoingMessage({
        to: jid,
        text: '❌ Você não tem permissão para gerar relatórios.',
        ticketId: undefined,
      });
      return { success: false, message: 'Permission denied' };
    }

    // 2. Definir período (últimos 7 dias)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    // 3. Gerar Relatório
    let message = '';

    if (technicianName) {
      // Relatório específico de um técnico
      const tech = await this.prisma.user.findFirst({
        where: {
          name: { contains: technicianName, mode: 'insensitive' },
          // Filtrar por ativos? Talvez
        },
      });

      if (!tech) {
        await this.rabbitmq.publishOutgoingMessage({
          to: jid,
          text: `❌ Técnico "${technicianName}" não encontrado.`,
          ticketId: undefined,
        });
        return { success: false, message: 'Technician not found' };
      }

      // Buscar métricas daquele técnico (MetricsService precisaria suportar range de data para técnico, 
      // mas `getTechnicianMetrics` calcula hoje/semana/mês fixo.
      // Vou usar getSectorMetrics filtrando pelo técnico para ter dados customizados se precisar, 
      // ou usar `getTechnicianMetrics` e mostrar os dados da semana.
      const metrics = await this.metricsService.getTechnicianMetrics(tech.id);

      if (!metrics) {
        message = `❌ Sem dados para o técnico ${tech.name}.`;
      } else {
        message = `📊 *Relatório: ${tech.name}*\n📅 Últimos 7 dias (Semana)\n\n`;
        message += `• Total (Histórico): ${metrics.metrics.totalTickets}\n`;
        message += `• Abertos: ${metrics.metrics.openTickets}\n`;
        message += `• Fechados (Semana): ${metrics.metrics.ticketsThisWeek} ✅\n`;
        message += `• Tempo Médio: ${metrics.metrics.avgResolutionTime}min\n`;
        message += `• SLA: ${metrics.metrics.slaCompliance}%\n`;
      }

    } else {
      // Relatório Geral (Todos os técnicos)
      const data = await this.metricsService.getSectorMetrics(sevenDaysAgo, today);

      message = `📊 *Relatório Geral (7 dias)*\n📅 ${sevenDaysAgo.toLocaleDateString()} - ${today.toLocaleDateString()}\n\n`;
      message += `Total Criados: ${data.totalTickets}\n`;
      message += `Fechados no Período: ${data.closedTickets} ✅\n`;
      message += `Tempo Médio: ${data.avgResolutionTime}min\n`;
      message += `SLA Compliance: ${data.slaCompliance}%\n\n`;

      if (data.byTechnician && data.byTechnician.length > 0) {
        message += `👨‍🔧 *Produtividade por Técnico:*\n`;
        const sorted = [...data.byTechnician].sort((a, b) => b.count - a.count); // count aqui é número de tickets no período pelo MetricsService?
        // MetricsService.getSectorMetrics :: byTechnician conta tickets *criados* ou *associados*?
        // Revisando MetricsService:
        // technicianCount[ticket.assignedTo.name]++
        // Itera sobre tickets onde `createdAt` está no range.
        // Então é "Tickets Criados e atribuídos a X neste período".

        sorted.forEach(t => {
          message += `• ${t.name}: ${t.count}\n`;
        });
      }
    }

    message += `\n🤖 _Gerado sob demanda por !relatorio_`;

    await this.rabbitmq.publishOutgoingMessage({
      to: jid,
      text: message,
      ticketId: undefined,
    });

    return { success: true };
  }
}
