import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';

@Controller('ai')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiController {
  @Get('reply-suggestions/:ticketId')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async getReplySuggestions(@Param('ticketId') _ticketId: string) {
    return [];
  }

  @Post('feedback')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async submitFeedback(@Body() _data: { messageId: string; correctedIntent: string }) {
    return { success: true };
  }

  @Get('analytics')
  @Roles('ADMIN', 'ADMIN_TI')
  async getAnalytics() {
    return {
      totalClassifications: 0,
      accuracy: null,
      avgConfidence: 0,
      topIntents: [],
    };
  }
}
