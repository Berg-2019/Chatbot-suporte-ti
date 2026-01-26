import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReportRecipientsService } from './report-recipients.service';
import { MetricsService } from '../metrics/metrics.service';

@Controller('reports/recipients')
export class ReportRecipientsController {
    constructor(
        private service: ReportRecipientsService,
        private metricsService: MetricsService
    ) { }

    @Post()
    async create(@Body() dto: { name: string; jid: string }) {
        return this.service.create(dto.name, dto.jid);
    }

    @Get()
    async findAll() {
        return this.service.findAll();
    }

    @Post('send')
    async sendReport(@Body() dto: { reportType?: string; filters?: any }) {
        // Obter dados do relatório
        let reportData;
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        if (dto.reportType === 'tickets' || !dto.reportType) {
            reportData = await this.metricsService.getSectorMetrics(startOfMonth, today);

            // Adicionar dados simplificados para template
            (reportData as any).totalTickets = reportData.summary.totalTickets;
            (reportData as any).openTickets = reportData.summary.openTickets;
            (reportData as any).closedTickets = reportData.summary.closedTickets;
            (reportData as any).avgResolutionMinutes = reportData.summary.avgResolutionTime;
            (reportData as any).slaCompliance = reportData.summary.slaCompliance;
        }

        // Buscar destinatários
        const recipients = await this.service.findAll();
        let sentCount = 0;

        // Enviar para cada um
        for (const recipient of recipients) {
            try {
                await this.service.sendReport(recipient.jid, reportData, dto.reportType || 'tickets');
                sentCount++;
            } catch (e) {
                console.error(`Erro ao enviar para ${recipient.name}:`, e);
            }
        }

        return { success: true, sent: sentCount, total: recipients.length };
    }
}
