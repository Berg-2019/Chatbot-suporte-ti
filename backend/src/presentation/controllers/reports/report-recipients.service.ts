import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';

@Injectable()
export class ReportRecipientsService {
  constructor(
    private prisma: PrismaService,
    private rabbitmq: RabbitMQService,
  ) {}

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

    msg += `\n🤖 _Enviado via Takeshi Bot_`;
    return msg;
  }
}
