import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CsatService } from './csat.service';

@Controller('csat')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CsatController {
  constructor(private readonly csat: CsatService) {}

  @Get('summary')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'DEV')
  async getSummary(@Query('period') period?: string) {
    const days = period ? parseInt(period) : 30;
    return this.csat.getSummary(days);
  }

  @Get('recent')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'DEV')
  async getRecent(@Query('limit') limit?: string) {
    return this.csat.getRecent(limit ? parseInt(limit) : 20);
  }

  @Get('ranking')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'DEV')
  async getAgentRanking(@Query('period') period?: string) {
    const days = period ? parseInt(period) : 30;
    return this.csat.getAgentRanking(days);
  }
}
