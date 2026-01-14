/**
 * Tickets Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TicketsService } from './tickets.service';
import { TicketStatus, Priority } from '@prisma/client';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  async findAll(
    @Query('status') status?: TicketStatus,
    @Query('assignedTo') assignedToId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.findAll({
      status,
      assignedToId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('pending')
  async findPending() {
    return this.ticketsService.findPending();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }

  @Post()
  async create(
    @Body()
    dto: {
      title: string;
      description: string;
      phoneNumber: string;
      customerName?: string;
      sector?: string;
      category?: string;
      priority?: Priority;
    },
  ) {
    return this.ticketsService.create(dto);
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Request() req: any) {
    return this.ticketsService.assign(id, { userId: req.user.id });
  }

  @Post(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body('userId') newUserId: string,
    @Request() req: any,
  ) {
    return this.ticketsService.transfer(id, newUserId, req.user.id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
  ) {
    return this.ticketsService.updateStatus(id, status);
  }

  @Post(':id/close')
  async close(@Param('id') id: string) {
    return this.ticketsService.close(id);
  }
}
