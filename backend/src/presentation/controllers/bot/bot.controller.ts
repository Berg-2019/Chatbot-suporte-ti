/**
 * Bot Controller - Status e controle do bot WhatsApp
 * O bot roda em container separado, aqui apenas expõe status
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../../infrastructure/cache/redis.service';

@Controller('bot')
@UseGuards(AuthGuard('jwt'))
export class BotController {
  constructor(private redis: RedisService) {}

  @Get('status')
  async getStatus() {
    // O bot atualiza seu status no Redis
    const statusRaw = await this.redis.get('bot:status');
    const status = statusRaw ? JSON.parse(statusRaw) : null;

    return {
      connected: status?.connected || false,
      phoneNumber: status?.phoneNumber || null,
      uptime: status?.uptime || 0,
      lastConnected: status?.lastConnected || null,
    };
  }
}
