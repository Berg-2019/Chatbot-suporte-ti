/**
 * Metrics Controller - Endpoints de Métricas
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MetricsService } from './metrics.service';

@Controller('api/metrics')
@UseGuards(AuthGuard('jwt'))
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
}
