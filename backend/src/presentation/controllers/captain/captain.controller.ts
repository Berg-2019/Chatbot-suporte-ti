/**
 * Captain AI Controller
 *
 * Endpoints para funcionalidades Captain AI:
 * - Assistant (auto-resposta)
 * - Co-Pilot (sugestões para agentes)
 * - FAQs (detecção de gaps)
 * - Memories (CRM inteligente)
 */

import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CaptainAssistantService } from '../../../infrastructure/ai/captain-assistant.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('captain')
export class CaptainController {
  constructor(private captainAssistant: CaptainAssistantService) {}

  /**
   * POST /api/captain/assist
   * Tenta resolver problema automaticamente
   */
  @Post('assist')
  async attemptAutoResolve(@Body() body: { message: string; phoneNumber: string; intent: string }) {
    const { message, phoneNumber, intent } = body;

    const response = await this.captainAssistant.attemptAutoResolve(
      message,
      phoneNumber,
      intent,
    );

    return {
      success: true,
      data: response,
    };
  }

  /**
   * POST /api/captain/feedback
   * Registra feedback sobre resposta do Captain
   */
  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  async provideFeedback(
    @Body()
    body: {
      attemptId: string;
      wasHelpful: boolean;
      agentComment?: string;
    },
  ) {
    const { attemptId, wasHelpful, agentComment } = body;

    await this.captainAssistant.provideFeedback(attemptId, wasHelpful, agentComment);

    return {
      success: true,
      message: 'Feedback registrado com sucesso',
    };
  }

  /**
   * GET /api/captain/performance
   * Estatísticas de performance do Captain
   */
  @Get('performance')
  @UseGuards(JwtAuthGuard)
  async getPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.captainAssistant.getPerformanceStats(start, end);

    return {
      success: true,
      data: stats,
    };
  }
}
