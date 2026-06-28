/**
 * Metrics Controller - Endpoints de Métricas
 */

import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Sector } from '@prisma/client';
import { MetricsService } from './metrics.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';

const VALID_SECTORS = new Set<string>(['TI', 'ELECTRIC', 'COMPRAS']);
const VALID_PERIODS = new Set<string>(['today', '7d', '30d']);

@Controller('metrics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.VIEWER)
export class MetricsController {
    constructor(private metricsService: MetricsService) { }

    /**
     * GET /api/metrics/dashboard
     * Resumo rápido para dashboard
     */
    @Get('dashboard')
    async getDashboard() {
        return this.metricsService.getDashboardSummary();
    }

    /**
     * GET /api/metrics/technicians
     * Métricas de todos os técnicos
     */
    @Get('technicians')
    async getAllTechnicians() {
        return this.metricsService.getAllTechniciansMetrics();
    }

    /**
     * GET /api/metrics/technicians/:id
     * Métricas de um técnico específico
     */
    @Get('technicians/:id')
    async getTechnician(@Param('id') id: string) {
        return this.metricsService.getTechnicianMetrics(id);
    }

    /**
     * GET /api/metrics/sector
     * Métricas gerais do setor
     */
    @Get('sector')
    async getSector(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        return this.metricsService.getSectorMetrics(start, end);
    }

    /**
     * GET /api/metrics/management?sector=&period=
     * Dashboard de gestão do setor (KPIs + SLA + ranking de agentes), em tempo real.
     * Setor vem do JWT (forçado) para admins de setor; só o ADMIN global pode
     * filtrar via query (ou ver consolidado).
     */
    @Get('management')
    @Roles(
        UserRole.ADMIN,
        UserRole.ADMIN_TI,
        UserRole.ADMIN_ELECTRIC,
        UserRole.ADMIN_COMPRAS,
    )
    async getManagement(
        @Request() req: any,
        @Query('sector') sectorQuery?: string,
        @Query('period') periodQuery?: string,
    ) {
        const user = req.user as { role: string; sector?: string };
        const isGlobalAdmin = user.role === 'ADMIN';

        let sector: Sector | undefined;
        if (isGlobalAdmin) {
            sector =
                sectorQuery && sectorQuery !== 'all' && VALID_SECTORS.has(sectorQuery)
                    ? (sectorQuery as Sector)
                    : undefined; // undefined = consolidado
        } else {
            // Admin de setor: setor vem do JWT, query ignorado (anti-IDOR).
            sector = user.sector as Sector | undefined;
        }

        const period = (VALID_PERIODS.has(periodQuery ?? '') ? periodQuery : '7d') as
            | 'today'
            | '7d'
            | '30d';

        return this.metricsService.getManagementDashboard({ sector, period });
    }
}
