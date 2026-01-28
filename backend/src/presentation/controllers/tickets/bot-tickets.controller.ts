/**
 * Bot Tickets Controller
 * Rotas públicas para o bot WhatsApp acessar tickets
 */

import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('bot/tickets')
export class BotTicketsController {
    constructor(private ticketsService: TicketsService) { }

    /**
     * Buscar ticket ativo por número de telefone
     * Usado pelo bot para verificar se usuário tem ticket em andamento
     */
    @Get('by-phone/:phone')
    async findByPhone(@Param('phone') phone: string) {
        return this.ticketsService.findByPhone(phone);
    }

    /**
     * Buscar ticket por ID do GLPI
     */
    @Get('glpi/:glpiId')
    async findByGlpiId(@Param('glpiId') glpiId: string) {
        return this.ticketsService.findByGlpiId(parseInt(glpiId));
    }

    /**
     * Avaliar um ticket (1-5)
     */
    @Post(':id/rate')
    async rateTicket(
        @Param('id') id: string,
        @Body('rating') rating: number,
    ) {
        return this.ticketsService.rate(id, rating);
    }
}
