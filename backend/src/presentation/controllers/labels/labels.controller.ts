/**
 * Labels Controller
 * Endpoints para gerenciar labels/tags de tickets
 */

import { Controller, Post, Delete, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

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
@UseGuards(AuthGuard('jwt'))
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  /**
   * Adiciona label a um ticket
   * POST /labels
   */
  @Post()
  @RequirePermissions('tickets:write', 'admin:settings')
  async addLabel(@Body() dto: AddLabelDto) {
    return this.labelsService.addLabel(dto);
  }

  /**
   * Adiciona múltiplas labels de uma vez
   * POST /labels/bulk
   */
  @Post('bulk')
  @RequirePermissions('tickets:write', 'admin:settings')
  async addMultipleLabels(@Body() dto: AddMultipleLabelsDto) {
    return this.labelsService.addMultipleLabels(dto.ticketId, dto.labels);
  }

  /**
   * Remove label de um ticket
   * DELETE /labels/:ticketId/:label
   */
  @Delete(':ticketId/:label')
  @RequirePermissions('tickets:write', 'admin:settings')
  async removeLabel(@Param('ticketId') ticketId: string, @Param('label') label: string) {
    return this.labelsService.removeLabel(ticketId, label);
  }

  /**
   * Lista labels de um ticket
   * GET /labels/ticket/:ticketId
   */
  @Get('ticket/:ticketId')
  @RequirePermissions('tickets:read')
  async getTicketLabels(@Param('ticketId') ticketId: string) {
    return this.labelsService.getTicketLabels(ticketId);
  }

  /**
   * Lista todas as labels únicas
   * GET /labels/unique
   */
  @Get('unique')
  @RequirePermissions('tickets:read')
  async getAllUniqueLabels() {
    return this.labelsService.getAllUniqueLabels();
  }

  /**
   * Busca tickets por label
   * GET /labels/search?label=urgente
   */
  @Get('search')
  @RequirePermissions('tickets:read')
  async searchByLabel(@Query('label') label: string) {
    return this.labelsService.getTicketsByLabel(label);
  }

  /**
   * Estatísticas de labels
   * GET /labels/statistics
   */
  @Get('statistics')
  @RequirePermissions('reports:read', 'admin:settings')
  async getStatistics() {
    return this.labelsService.getStatistics();
  }
}
