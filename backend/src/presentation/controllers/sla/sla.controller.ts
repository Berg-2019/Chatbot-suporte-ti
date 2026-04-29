import {
  Controller, Get, Post, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SlaService } from './sla.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('sla')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
  async getDashboard() {
    return this.slaService.getDashboard();
  }

  @Get('breaches')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
  async getBreaches() {
    return this.slaService.getBreaches();
  }

  @Post('tickets/:ticketId/start')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async startTimer(@Param('ticketId') ticketId: string) {
    return this.slaService.createTimerForTicket(ticketId);
  }

  @Post('tickets/:ticketId/pause')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async pauseTimer(@Param('ticketId') ticketId: string) {
    return this.slaService.pauseTimer(ticketId);
  }

  @Post('tickets/:ticketId/resume')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async resumeTimer(@Param('ticketId') ticketId: string) {
    return this.slaService.resumeTimer(ticketId);
  }

  @Patch('tickets/:ticketId/first-response')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async markFirstResponse(@Param('ticketId') ticketId: string) {
    return this.slaService.markFirstResponse(ticketId);
  }

  @Patch('tickets/:ticketId/resolved')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async markResolved(@Param('ticketId') ticketId: string) {
    return this.slaService.markResolved(ticketId);
  }

  @Get('tickets/:ticketId')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async getTimer(@Param('ticketId') ticketId: string) {
    return this.slaService.getTimer(ticketId);
  }
}