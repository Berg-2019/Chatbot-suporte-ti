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
  Res,
  NotFoundException,
  SetMetadata,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TicketStatus, Priority, TicketType } from '@prisma/client';
import { SectorGuard } from '../../../common/guards/sector.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'), SectorGuard, RolesGuard)
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private prisma: PrismaService,
  ) { }

  @Get()
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async findAll(
    @Request() req: any,
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
      sector: req.user.sector,
      isAdmin: req.user.role.startsWith('ADMIN_'),
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
    @Request() req: any,
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
    return this.ticketsService.close(id, closeData, req.user?.id);
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
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    if (!file) throw new Error('Arquivo não enviado');
    return this.ticketsService.addAttachment(id, file, req.user?.id);
  }

  // Endpoint público (sem JWT) para o bot baixar o anexo
  @Get('attachments/:attachmentId/file')
  @SetMetadata('isPublic', true)
  async serveAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const att = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att || !existsSync(att.path)) {
      throw new NotFoundException('Anexo não encontrado');
    }
    res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${att.filename}"`);
    createReadStream(att.path).pipe(res);
  }

  @Post(':id/auto-assign')
  @UseGuards(AuthGuard('jwt'))
  async autoAssign(
    @Param('id') id: string,
    @Body() options?: {
      sector?: string;
      technicianLevel?: 'N1' | 'N2' | 'N3';
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    },
  ) {
    return this.ticketsService.autoAssignAgent(id, options);
  }
}
