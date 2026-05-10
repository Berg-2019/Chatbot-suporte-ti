/**
 * Intent Detection Controller
 * Endpoints para classificação de intenções e estatísticas
 */

import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { IntentService } from './intent.service';
import { AuthGuard } from '@nestjs/passport';

class ClassifyIntentDto {
  userMessage: string;
  phoneNumber?: string;
}

class GetStatisticsDto {
  startDate?: string; // ISO date
  endDate?: string; // ISO date
}

@Controller('intent')
@UseGuards(AuthGuard('jwt'))
export class IntentController {
  constructor(private readonly intentService: IntentService) {}

  /**
   * Classifica intenção de uma mensagem
   * POST /intent/classify
   */
  @Post('classify')
  async classify(@Body() dto: ClassifyIntentDto) {
    return this.intentService.classify(dto.userMessage, dto.phoneNumber);
  }

  /**
   * Retorna estatísticas de classificação
   * GET /intent/statistics
   */
  @Get('statistics')
  async getStatistics(@Query() query: GetStatisticsDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.intentService.getStatistics(startDate, endDate);
  }

  /**
   * Retorna classificações recentes
   * GET /intent/recent?limit=50
   */
  @Get('recent')
  async getRecent(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.intentService.getRecentClassifications(parsedLimit);
  }

  /**
   * Retorna ação sugerida para uma intenção
   * GET /intent/action?intent=abrir_ticket_ti
   */
  @Get('action')
  async getSuggestedAction(@Query('intent') intent: string) {
    return {
      intent,
      suggestedAction: this.intentService.getSuggestedAction(intent),
    };
  }

  /**
   * Retorna status do serviço de Intent Detection
   * GET /intent/status
   */
  @Get('status')
  async getStatus() {
    return this.intentService.getStatus();
  }
}
