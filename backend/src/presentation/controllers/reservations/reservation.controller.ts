/**
 * Reservation Controller - API Endpoints for Asset Scheduling
 */

import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import {
    CreateReservationDto,
    UpdateReservationStatusDto,
    ReservationQueryDto,
} from './reservation.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';

@Controller('reservations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReservationController {
    constructor(private readonly reservationService: ReservationService) { }

    /**
     * GET /api/reservations
     * Lista reservas com filtros
     */
    @Get()
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async findAll(@Query() query: ReservationQueryDto) {
        return this.reservationService.findAll(query);
    }

    /**
     * GET /api/reservations/pending-count
     * Quantidade de reservas pendentes
     */
    @Get('pending-count')
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER)
    async getPendingCount() {
        const count = await this.reservationService.getPendingCount();
        return { count };
    }

    /**
     * GET /api/reservations/timeline
     * Timeline para cronograma
     */
    @Get('timeline')
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async getTimeline(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reservationService.getTimeline(
            new Date(startDate),
            new Date(endDate),
        );
    }

    /**
     * GET /api/reservations/:id
     * Busca uma reserva por ID
     */
    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async findOne(@Param('id') id: string) {
        return this.reservationService.findOne(id);
    }

    /**
     * POST /api/reservations
     * Cria uma nova reserva
     */
    @Post()
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER)
    async create(@Body() dto: CreateReservationDto) {
        return this.reservationService.create(dto);
    }

    /**
     * PATCH /api/reservations/:id/status
     * Atualiza status (aprovar, rejeitar, etc)
     */
    @Patch(':id/status')
    @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateReservationStatusDto,
        @Request() req: any,
    ) {
        return this.reservationService.updateStatus(id, dto, req.user?.id);
    }

    /**
     * POST /api/reservations/:id/approve
     * Atalho para aprovar
     */
    @Post(':id/approve')
    @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
    async approve(@Param('id') id: string, @Request() req: any) {
        return this.reservationService.updateStatus(
            id,
            { status: 'APPROVED' as any },
            req.user?.id,
        );
    }

    /**
     * POST /api/reservations/:id/reject
     * Atalho para rejeitar
     */
    @Post(':id/reject')
    @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
    async reject(@Param('id') id: string, @Body('notes') notes?: string) {
        return this.reservationService.updateStatus(id, {
            status: 'REJECTED' as any,
            notes,
        });
    }
}
