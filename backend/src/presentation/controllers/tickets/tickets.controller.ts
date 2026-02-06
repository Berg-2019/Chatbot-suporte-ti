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
  SetMetadata,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { TicketsService } from './tickets.service';
import { TicketStatus, Priority, TicketType } from '@prisma/client';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketsController {
  constructor(private ticketsService: TicketsService) { }

  @Get()
  async findAll(
    @Query('status') status?: TicketStatus,
    @Query('assignedTo') assignedToId?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: TicketType,
  ) {
    return this.ticketsService.findAll({
      status,
      assignedToId,
      category,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      type,
    });
  }

  @Get('pending')
  async findPending() {
    return this.ticketsService.findPending();
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.ticketsService.findById(id, req.user);
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
      type?: TicketType;
      location?: string;
      assignedToId?: string;
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
  async close(
    @Param('id') id: string,
    @Body()
    closeData?: {
      solution?: string;
      solutionType?: string;
      timeWorked?: number;
      parts?: Array<{
        partId?: string;
        partName: string;
        quantity: number;
        unitCost: number;
        purchased?: boolean;
      }>;
    },
  ) {
    return this.ticketsService.close(id, closeData);
  }

  // === Novos endpoints para bot ===

  @Post(':id/rate')
  @SetMetadata('isPublic', true)
  async rateTicket(
    @Param('id') id: string,
    @Body('rating') rating: number,
  ) {
    return this.ticketsService.rate(id, rating);
  }

  @Get('by-phone/:phone')
  @SetMetadata('isPublic', true)
  async findByPhone(@Param('phone') phone: string) {
    return this.ticketsService.findByPhone(phone);
  }

  @Get('glpi/:glpiId')
  @SetMetadata('isPublic', true)
  async findByGlpiId(@Param('glpiId') glpiId: string) {
    return this.ticketsService.findByGlpiId(parseInt(glpiId));
  }

  @Post(':id/attachments')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: any, // Using explicit any to avoid lint issues with missing types
  ) {
    if (!file) throw new Error('Arquivo não enviado');
    return this.ticketsService.addAttachment(id, file);
  }
}
