import { Controller, Get, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ReportRecipientsService } from './report-recipients.service';
import { MetricsService } from '../metrics/metrics.service';
import { redactName } from '../../../infrastructure/logger/redact';

class CreateRecipientDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    jid: string;
}

class SendReportDto {
    @IsOptional()
    @IsString()
    reportType?: string;

    @IsOptional()
    @IsObject()
    filters?: Record<string, unknown>;

    @IsOptional()
    @IsString()
    recipientJid?: string;
}

class AdhocReportDto {
    @IsString()
    @IsNotEmpty()
    jid: string;

    @IsOptional()
    @IsString()
    technician?: string;
}

@Controller('reports/recipients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
export class ReportRecipientsController {
    private readonly logger = new Logger(ReportRecipientsController.name);

    constructor(
        private service: ReportRecipientsService,
        private metricsService: MetricsService
    ) { }

    @Post()
    async create(@Body() dto: CreateRecipientDto) {
        return this.service.create(dto.name, dto.jid);
    }

    @Get()
    async findAll() {
        return this.service.findAll();
    }

    @Post('send')
    async sendReport(@Body() dto: SendReportDto) {
        // Obter dados do relatório
        let reportData;
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        if (dto.reportType === 'tickets' || !dto.reportType) {
            reportData = await this.metricsService.getSectorMetrics(startOfMonth, today);

            // Adicionar dados simplificados para template
            (reportData as any).totalTickets = reportData.totalTickets;
            (reportData as any).openTickets = reportData.openTickets;
            (reportData as any).closedTickets = reportData.closedTickets;
            (reportData as any).avgResolutionMinutes = reportData.avgResolutionTime;
            (reportData as any).slaCompliance = reportData.slaCompliance;
        }

        // Buscar destinatários
        let recipients = await this.service.findAll();

        // Se especificou um destinatário, filtrar
        if (dto.recipientJid) {
            recipients = recipients.filter(r => r.jid === dto.recipientJid);
        }

        let sentCount = 0;

        // Enviar para cada um
        for (const recipient of recipients) {
            try {
                await this.service.sendReport(recipient.jid, reportData, dto.reportType || 'tickets');
                sentCount++;
            } catch (e) {
                this.logger.error(`Erro ao enviar para rid:${recipient.id}`, e);
            }
        }

        return { success: true, sent: sentCount, total: recipients.length };
    }

    @Post('adhoc')
    async sendAdhocReport(@Body() dto: AdhocReportDto) {
        return this.service.sendAdhocReport(dto.jid, dto.technician);
    }
}
