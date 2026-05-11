/**
 * Tickets Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  SetMetadata,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Response } from 'express';
import { IsString, IsOptional, IsEnum, IsUUID, MinLength } from 'class-validator';
import { TicketsService } from './tickets.service';
import { TicketStatus, Priority, TicketType, Sector } from '@prisma/client';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuthUser } from '../../../domain/auth-user';
import { HermesApiKeyGuard } from '../hermes/guards/hermes-api-key.guard';

class CreateTicketDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(5)
  description: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEnum(Sector)
  sector?: Sector;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  affectedAssetId?: string;
}

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
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
    const user = req.user as AuthUser;
    return this.ticketsService.findAll({
      status,
      assignedToId,
      category,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      type,
      sector: user.sector as Sector,
      isAdmin: user.role.startsWith('ADMIN_'),
    });
  }

  @Get('my')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async findMy(
    @Request() req: any,
    @Query('status') status?: TicketStatus,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as AuthUser;
    return this.ticketsService.findAll({
      status,
      category,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sector: user.sector as Sector,
      assignedToId: user.id,
    });
  }

  @Get('pending')
  async findPending() {
    return this.ticketsService.findPending();
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.ticketsService.getTicketHistory(id);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.ticketsService.findById(id, req.user as AuthUser);
  }

  @Post()
  async create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    return this.ticketsService.addNote(id, content, (req.user as AuthUser).id);
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Request() req: any) {
    return this.ticketsService.assign(id, { userId: (req.user as AuthUser).id });
  }

  @Post(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body('userId') newUserId: string,
    @Request() req: any,
  ) {
    return this.ticketsService.transfer(id, newUserId, (req.user as AuthUser).id);
  }

  @Patch(':id/status')
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
    return this.ticketsService.close(id, closeData, (req.user as AuthUser)?.id);
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
  @UseGuards(HermesApiKeyGuard)
  async findByPhone(@Param('phone') phone: string) {
    return this.ticketsService.findByPhone(phone);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    return this.ticketsService.addAttachment(id, file, (req.user as AuthUser)?.id);
  }

  @Get('attachments/:attachmentId/file')
  @UseGuards(HermesApiKeyGuard)
  async serveAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, filename } = await this.ticketsService.getAttachmentStream(attachmentId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    stream.pipe(res);
  }

  @Post(':id/auto-assign')
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
