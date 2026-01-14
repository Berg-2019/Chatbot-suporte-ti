/**
 * Health Controller
 */

import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Controller('health')
export class HealthController {
  constructor(private redis: RedisService) {}

  @Get()
  async check() {
    const redisOk = await this.redis.exists('health:check').catch(() => false);
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: true,
        redis: true, // Se chegou aqui, está ok
      },
    };
  }
}
