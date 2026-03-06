/**
 * Live View Controller - Real-time monitoring endpoints
 */

import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LiveViewService } from './live-view.service';

@Controller('live-view')
@UseGuards(AuthGuard('jwt'))
export class LiveViewController {
    constructor(private liveViewService: LiveViewService) {}

    @Get('conversations')
    async getActiveConversations(
        @Query('sector') sector?: string,
        @Query('status') status?: string,
        @Query('agentId') agentId?: string,
    ) {
        return this.liveViewService.getActiveConversations(sector, status, agentId);
    }

    @Get('stats')
    async getLiveStats(@Query('sector') sector?: string) {
        return this.liveViewService.getLiveStats(sector);
    }

    @Get('agents')
    async getAgentActivity() {
        return this.liveViewService.getAgentActivity();
    }

    @Get('unassigned')
    async getUnassignedTickets() {
        return this.liveViewService.getUnassignedTickets();
    }

    @Get('timeline/:ticketId')
    async getConversationTimeline(@Param('ticketId') ticketId: string) {
        return this.liveViewService.getConversationTimeline(ticketId);
    }
}
