/**
 * Bot Controller - Status e controle do bot WhatsApp
 * O bot roda em container separado, aqui apenas expõe status
 */

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('bot')
export class BotController {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
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

  /**
   * Endpoint interno para o bot criar tickets (sem autenticação JWT)
   * Apenas para uso interno pelo bot WhatsApp
   */
  @Post('ticket')
  async createTicketFromBot(
    @Body()
    dto: {
      glpiId: number;
      title: string;
      description: string;
      phoneNumber: string;
      sector?: string;
      category?: string;
    },
  ) {
    const ticket = await this.prisma.ticket.create({
      data: {
        glpiId: dto.glpiId,
        title: dto.title,
        description: dto.description,
        phoneNumber: dto.phoneNumber,
        sector: dto.sector || 'TI',
        category: dto.category || 'Incidente',
        priority: 'NORMAL',
        status: 'NEW',
      },
    });

    console.log(`✅ Ticket criado via bot: ${ticket.id} (GLPI #${dto.glpiId})`);

    return ticket;
  }
}

