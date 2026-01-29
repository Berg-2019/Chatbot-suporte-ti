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

@Controller('reservations')
@UseGuards(AuthGuard('jwt'))
export class ReservationController {
    constructor(private readonly reservationService: ReservationService) { }

    /**
     * GET /api/reservations
     * Lista reservas com filtros
     */
    @Get()
    async findAll(@Query() query: ReservationQueryDto) {
        return this.reservationService.findAll(query);
    }

    /**
     * GET /api/reservations/pending-count
     * Quantidade de reservas pendentes
     */
    @Get('pending-count')
    async getPendingCount() {
        const count = await this.reservationService.getPendingCount();
        return { count };
    }

    /**
     * GET /api/reservations/timeline
     * Timeline para cronograma
     */
    @Get('timeline')
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
    async findOne(@Param('id') id: string) {
        return this.reservationService.findOne(id);
    }

    /**
     * POST /api/reservations
     * Cria uma nova reserva
     */
    @Post()
    async create(@Body() dto: CreateReservationDto) {
        return this.reservationService.create(dto);
    }

    /**
     * PATCH /api/reservations/:id/status
     * Atualiza status (aprovar, rejeitar, etc)
     */
    @Patch(':id/status')
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
    async reject(@Param('id') id: string, @Body('notes') notes?: string) {
        return this.reservationService.updateStatus(id, {
            status: 'REJECTED' as any,
            notes,
        });
    }
}
