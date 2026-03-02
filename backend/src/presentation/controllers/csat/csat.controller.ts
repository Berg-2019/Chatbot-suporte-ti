/**
 * CSAT Controller
 * Gerencia pesquisas de satisfação (Customer Satisfaction)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CsatService } from '../../../infrastructure/services/csat.service';
import { AuthGuard } from '@nestjs/passport';
import {
  RequirePermissions,
  RequireAnyPermission,
} from '../../../common/decorators/require-permissions.decorator';
import { SendCsatDto, SubmitCsatDto, CsatReportQueryDto, ReviewNoteDto } from './csat.dto';

@Controller('csat')
@UseGuards(AuthGuard('jwt'))
export class CsatController {
  constructor(private readonly csatService: CsatService) { }

  /**
   * POST /csat/send
   * Enviar pesquisa CSAT para um ticket
   * Usado pelo sistema ao fechar ticket
   */
  @Post('send')
  @RequirePermissions('tickets:write')
  async sendCsat(@Body() dto: SendCsatDto) {
    return this.csatService.sendCsat(dto);
  }

  /**
   * POST /csat/submit
   * Submeter resposta de CSAT (cliente)
   * Sem autenticação - pode ser chamado pelo bot
   */
  @Post('submit')
  async submitCsat(@Body() dto: SubmitCsatDto) {
    return this.csatService.submitCsat(dto);
  }

  /**
   * GET /csat/ticket/:ticketId
   * Buscar CSAT de um ticket específico
   */
  @Get('ticket/:ticketId')
  @RequirePermissions('tickets:read')
  async findByTicket(@Param('ticketId') ticketId: string) {
    return this.csatService.findByTicket(ticketId);
  }

  /**
   * GET /csat
   * Listar todas as respostas CSAT com filtros
   */
  @Get()
  @RequirePermissions('reports:read')
  async findAll(@Query() query: CsatReportQueryDto) {
    const filters = {
      assignedToId: query.assignedToId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      hasResponse: true, // Apenas respondidos
    };

    return this.csatService.findAll(filters);
  }

  /**
   * GET /csat/stats
   * Estatísticas gerais de CSAT
   */
  @Get('stats')
  @RequirePermissions('reports:read')
  async getStats(@Query() query: CsatReportQueryDto) {
    const filters = {
      assignedToId: query.assignedToId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return this.csatService.getStats(filters);
  }

  /**
   * GET /csat/stats/by-technician
   * Estatísticas por técnico
   */
  @Get('stats/by-technician')
  @RequireAnyPermission('reports:read', 'users:read')
  async getStatsByTechnician(@Query() query: CsatReportQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.csatService.getStatsByTechnician(startDate, endDate);
  }

  /**
   * PATCH /csat/ticket/:ticketId/review
   * Adicionar nota de revisão (admin/supervisor)
   */
  @Patch('ticket/:ticketId/review')
  @RequireAnyPermission('admin:settings', 'reports:write')
  async addReviewNote(
    @Param('ticketId') ticketId: string,
    @Body() dto: ReviewNoteDto
  ) {
    return this.csatService.addReviewNote(ticketId, dto.note, dto.reviewedBy);
  }
}
