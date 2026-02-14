/**
 * Reports Controller - Endpoints para Relatórios Detalhados
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

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
