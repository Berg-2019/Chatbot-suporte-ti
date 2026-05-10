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
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SendCsatDto, SubmitCsatDto, CsatReportQueryDto, ReviewNoteDto } from './csat.dto';

@Controller('csat')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CsatController {
  constructor(private readonly csatService: CsatService) { }

  /**
   * POST /csat/send
   * Enviar pesquisa CSAT para um ticket
   * Usado pelo sistema ao fechar ticket
   */
  @Post('send')
  @Roles('ADMIN', 'AGENT')
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
  @Roles('ADMIN', 'AGENT')
  async findByTicket(@Param('ticketId') ticketId: string) {
    return this.csatService.findByTicket(ticketId);
  }

  /**
   * GET /csat
   * Listar todas as respostas CSAT com filtros
   */
  @Get()
  @Roles('ADMIN', 'AGENT')
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
  @Roles('ADMIN', 'AGENT')
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
  @Roles('ADMIN', 'AGENT')
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
  @Roles('ADMIN')
  async addReviewNote(
    @Param('ticketId') ticketId: string,
    @Body() dto: ReviewNoteDto
  ) {
    return this.csatService.addReviewNote(ticketId, dto.note, dto.reviewedBy);
  }
}
