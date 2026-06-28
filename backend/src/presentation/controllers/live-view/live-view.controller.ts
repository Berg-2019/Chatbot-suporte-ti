/**
 * Live View Controller - Real-time monitoring endpoints
 */

import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LiveViewService } from './live-view.service';

@Controller('live-view')
@UseGuards(AuthGuard('jwt'))
export class LiveViewController {
    constructor(private liveViewService: LiveViewService) {}

    /**
     * Resolve o setor a aplicar: ADMIN global pode filtrar qualquer setor
     * (ou ver todos, se omitido); demais ficam travados no próprio setor do JWT.
     * Ignora o query param do cliente para usuários não-admin (anti-IDOR).
     */
    private scopeSector(req: any, requested?: string): string | undefined {
        return req.user?.role === 'ADMIN' ? requested : req.user?.sector;
    }

    @Get('conversations')
    async getActiveConversations(
        @Req() req: any,
        @Query('sector') sector?: string,
        @Query('status') status?: string,
        @Query('agentId') agentId?: string,
    ) {
        return this.liveViewService.getActiveConversations(this.scopeSector(req, sector), status, agentId);
    }

    @Get('stats')
    async getLiveStats(@Req() req: any, @Query('sector') sector?: string) {
        return this.liveViewService.getLiveStats(this.scopeSector(req, sector));
    }

    @Get('agents')
    async getAgentActivity(@Req() req: any) {
        return this.liveViewService.getAgentActivity(this.scopeSector(req));
    }

    @Get('unassigned')
    async getUnassignedTickets(@Req() req: any) {
        return this.liveViewService.getUnassignedTickets(this.scopeSector(req));
    }

    @Get('timeline/:ticketId')
    async getConversationTimeline(@Param('ticketId') ticketId: string) {
        return this.liveViewService.getConversationTimeline(ticketId);
    }
}
