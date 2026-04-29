/**
 * Hermes Integration Controller
 * 
 * Endpoints para integração com o Hermes Agent.
 * Protegidos por API Key (header x-api-key).
 * Segue padrões REST do projeto.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HermesApiKeyGuard } from './guards/hermes-api-key.guard';
import { HermesService } from './hermes.service';
import {
  CreateHermesTicketDto,
  EscalateDto,
  CreateHermesReservationDto,
} from './dto';

@Controller('hermes')
@UseGuards(HermesApiKeyGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HermesController {
  private readonly logger = new Logger(HermesController.name);

  constructor(private readonly hermesService: HermesService) {}

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Health check para o Hermes verificar se o backend está acessível.
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'hermes-integration',
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // TICKETS
  // ============================================

  /**
   * POST /api/hermes/tickets
   * Cria um novo ticket de suporte originado pelo Hermes.
   */
  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(@Body() dto: CreateHermesTicketDto) {
    this.logger.log(`📥 Hermes → Criar ticket: "${dto.title}"`);
    return this.hermesService.createTicket(dto);
  }

  /**
   * GET /api/hermes/tickets/:id
   * Consulta detalhes de um ticket.
   */
  @Get('tickets/:id')
  async getTicket(@Param('id') id: string) {
    return this.hermesService.getTicketById(id);
  }

  /**
   * GET /api/hermes/tickets/by-phone/:phone
   * Lista tickets de um número de telefone.
   */
  @Get('tickets/by-phone/:phone')
  async getTicketsByPhone(@Param('phone') phone: string) {
    return this.hermesService.getTicketsByPhone(phone);
  }

  // ============================================
  // FAQ
  // ============================================

  /**
   * GET /api/hermes/faq/search?q=...&category=...
   * Busca na base de conhecimento.
   */
  @Get('faq/search')
  async searchFaq(
    @Query('q') query: string,
    @Query('category') category?: string,
  ) {
    return this.hermesService.searchFaq(query, category);
  }

  /**
   * POST /api/hermes/faq/:id/helpful
   * Marca um artigo FAQ como útil ou não.
   */
  @Post('faq/:id/helpful')
  @HttpCode(HttpStatus.OK)
  async markFaqHelpful(
    @Param('id') id: string,
    @Body() body: { helpful: boolean },
  ) {
    return this.hermesService.markFaqHelpful(id, body.helpful);
  }

  // ============================================
  // ESTOQUE / RESERVAS
  // ============================================

  /**
   * GET /api/hermes/stock?stockType=...
   * Verifica disponibilidade de equipamentos.
   */
  @Get('stock')
  async checkStock(@Query('stockType') stockType?: string) {
    return this.hermesService.checkStock(stockType);
  }

  /**
   * POST /api/hermes/reservations
   * Cria reserva de equipamento.
   */
  @Post('reservations')
  @HttpCode(HttpStatus.CREATED)
  async createReservation(@Body() dto: CreateHermesReservationDto) {
    this.logger.log(`📥 Hermes → Reserva: item ${dto.stockItemId}`);
    return this.hermesService.createReservation(dto);
  }

  // ============================================
  // AGENTES / ESCALAÇÃO
  // ============================================

  /**
   * GET /api/hermes/agents/status
   * Retorna informações sobre agentes disponíveis.
   */
  @Get('agents/status')
  async getAgentsStatus() {
    return this.hermesService.getAgentsStatus();
  }

  /**
   * POST /api/hermes/escalate
   * Escala uma conversa para um atendente humano.
   */
  @Post('escalate')
  @HttpCode(HttpStatus.OK)
  async escalateToAgent(@Body() dto: EscalateDto) {
    this.logger.log(`📥 Hermes → Escalação: ${dto.phone} | ${dto.urgency}`);
    return this.hermesService.escalateToAgent(dto);
  }

  // ============================================
  // WEBHOOKS / CALLBACKS
  // ============================================

  /**
   * POST /api/hermes/webhook
   * Recebe callbacks/notificações do Hermes Agent.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: { event: string; payload: any }) {
    this.logger.log(`📥 Hermes → Webhook: ${body.event}`);
    return this.hermesService.handleWebhook(body.event, body.payload);
  }
}
