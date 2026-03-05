/**
 * Macros Controller - Bulk Actions for Tickets
 */

import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MacrosService } from './macros.service';
import { ExecuteMacroDto } from './macros.dto';

@Controller('macros')
@UseGuards(AuthGuard('jwt'))
export class MacrosController {
    constructor(private macrosService: MacrosService) {}

    @Post('execute')
    async executeBulkAction(@Body() dto: ExecuteMacroDto) {
        return this.macrosService.executeBulkAction(
            dto.ticketIds,
            dto.action,
            dto.value,
            dto.sendNotification,
        );
    }

    @Get('stats')
    async getStats() {
        return this.macrosService.getBulkActionStats();
    }
}
