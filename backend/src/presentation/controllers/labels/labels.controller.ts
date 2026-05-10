/**
 * Labels Controller
 * Endpoints para gerenciar labels/tags de tickets
 */

import { Controller, Post, Delete, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';

class AddLabelDto {
  ticketId: string;
  label: string;
  color?: string;
}

class AddMultipleLabelsDto {
  ticketId: string;
  labels: string[];
}

@Controller('labels')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  /**
   * Adiciona label a um ticket
   * POST /labels
   */
  @Post()
  @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
  async addLabel(@Body() dto: AddLabelDto) {
    return this.labelsService.addLabel(dto);
  }

  /**
   * Adiciona múltiplas labels de uma vez
   * POST /labels/bulk
   */
  @Post('bulk')
  @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
  async addMultipleLabels(@Body() dto: AddMultipleLabelsDto) {
    return this.labelsService.addMultipleLabels(dto.ticketId, dto.labels);
  }

  /**
   * Remove label de um ticket
   * DELETE /labels/:ticketId/:label
   */
  @Delete(':ticketId/:label')
  @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
  async removeLabel(@Param('ticketId') ticketId: string, @Param('label') label: string) {
    return this.labelsService.removeLabel(ticketId, label);
  }

  /**
   * Lista labels de um ticket
   * GET /labels/ticket/:ticketId
   */
  @Get('ticket/:ticketId')
  @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
  async getTicketLabels(@Param('ticketId') ticketId: string) {
    return this.labelsService.getTicketLabels(ticketId);
  }

  /**
   * Lista todas as labels únicas
   * GET /labels/unique
   */
  @Get('unique')
  @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
  async getAllUniqueLabels() {
    return this.labelsService.getAllUniqueLabels();
  }

  /**
   * Busca tickets por label
   * GET /labels/search?label=urgente
   */
  @Get('search')
  @Roles('ADMIN', 'ADMIN_TI', 'AGENT')
  async searchByLabel(@Query('label') label: string) {
    return this.labelsService.getTicketsByLabel(label);
  }

  /**
   * Estatísticas de labels
   * GET /labels/statistics
   */
  @Get('statistics')
  @Roles('ADMIN', 'ADMIN_TI')
  async getStatistics() {
    return this.labelsService.getStatistics();
  }
}
