/**
 * Reports Controller - Endpoints para Relatórios Detalhados
 */

import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { AgentReportService } from './agent-report.service';
import { ReportAiService } from './report-ai.service';
import { AgentReportPdfService, AgentReportBundle } from './agent-report-pdf.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';
import { Sector } from '@prisma/client';

const VALID_SECTORS = new Set(['TI', 'ELECTRIC', 'COMPRAS']);
const SECTOR_LABEL: Record<string, string> = { TI: 'TI', ELECTRIC: 'Elétrica', COMPRAS: 'Compras' };

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
    constructor(
        private readonly reportsService: ReportsService,
        private readonly agentReport: AgentReportService,
        private readonly reportAi: ReportAiService,
        private readonly agentPdf: AgentReportPdfService,
    ) { }

    /** Período padrão: últimos 30 dias. */
    private parsePeriod(startDate?: string, endDate?: string): { start: Date; end: Date } {
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start, end };
    }

    private sendPdf(res: Response, buffer: Buffer, filename: string) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    }

    /**
     * GET /api/reports/agents
     * Lista de agentes (escopada por setor) para o seletor do relatório.
     */
    @Get('agents')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.ADMIN_COMPRAS)
    async listAgents(@Req() req: any, @Query('sector') sectorQuery?: string) {
        const user = req.user as { role: string; sector?: string };
        const sector: Sector | undefined = user.role === 'ADMIN'
            ? (sectorQuery && VALID_SECTORS.has(sectorQuery) ? (sectorQuery as Sector) : undefined)
            : (user.sector as Sector | undefined);
        return this.agentReport.listAgents(sector);
    }

    /**
     * GET /api/reports/agent/:agentId/pdf
     * PDF de desempenho de um agente (estatística + análise por IA).
     */
    @Get('agent/:agentId/pdf')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.ADMIN_COMPRAS)
    async getAgentPdf(
        @Req() req: any,
        @Res() res: Response,
        @Param('agentId') agentId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const user = req.user as { role: string; sector?: string };
        const { start, end } = this.parsePeriod(startDate, endDate);
        const data = await this.agentReport.getAgentReport(agentId, start, end, user);
        const analysis = await this.reportAi.analyze(data);
        const buffer = await this.agentPdf.buildAgentPdf({ data, analysis });
        const safeName = data.agent.name.replace(/[^\w]+/g, '-').toLowerCase();
        this.sendPdf(res, buffer, `desempenho-${safeName}.pdf`);
    }

    /**
     * GET /api/reports/agents/pdf
     * PDF consolidado de todos os agentes do setor.
     */
    @Get('agents/pdf')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.ADMIN_COMPRAS)
    async getAgentsPdf(
        @Req() req: any,
        @Res() res: Response,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('sector') sectorQuery?: string,
    ) {
        const user = req.user as { role: string; sector?: string };
        const isGlobalAdmin = user.role === 'ADMIN';
        const sector: Sector | undefined = isGlobalAdmin
            ? (sectorQuery && VALID_SECTORS.has(sectorQuery) ? (sectorQuery as Sector) : undefined)
            : (user.sector as Sector | undefined);

        const { start, end } = this.parsePeriod(startDate, endDate);
        const agents = await this.agentReport.listAgents(sector);

        // Roda em paralelo: sequencial multiplicava a latência pelo nº de
        // agentes (cada análise de IA leva até 20s), estourando o timeout
        // do client antes do backend terminar.
        const bundles: AgentReportBundle[] = await Promise.all(
            agents.map(async (a) => {
                const data = await this.agentReport.getAgentReport(a.id, start, end);
                const analysis = await this.reportAi.analyze(data);
                return { data, analysis };
            }),
        );

        const sectorLabel = sector ? SECTOR_LABEL[sector] : 'Todos';
        const buffer = await this.agentPdf.buildConsolidatedPdf(bundles, sectorLabel, { start, end });
        this.sendPdf(res, buffer, `desempenho-consolidado-${sectorLabel.toLowerCase()}.pdf`);
    }

    /**
     * GET /api/reports/tickets
     * Relatório detalhado de tickets fechados
     */
    @Get('tickets')
    @Roles(UserRole.ADMIN, UserRole.AGENT)
    async getTicketClosureReport(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('technicianId') technicianId?: string,
        @Query('category') category?: string,
        @Query('solutionType') solutionType?: string,
    ) {
        return this.reportsService.getTicketClosureReport({
            startDate,
            endDate,
            technicianId,
            category,
            solutionType,
        });
    }

    /**
     * GET /api/reports/stock
     * Relatório de movimentações de estoque
     */
    @Get('stock')
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER)
    async getStockMovementReport(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('stockType') stockType?: string,
        @Query('category') category?: string,
        @Query('movementType') movementType?: string,
    ) {
        return this.reportsService.getStockMovementReport({
            startDate,
            endDate,
            stockType,
            category,
            movementType,
        });
    }
}
