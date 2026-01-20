/**
 * Bot Controller - Status e controle do bot WhatsApp
 * O bot roda em container separado, aqui faz proxy para os endpoints do bot
 */

import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';

const BOT_API_URL = process.env.BOT_API_URL || 'http://bot:3002';

@Controller('bot')
export class BotController {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) { }

  private async proxyToBot(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    try {
      const url = `${BOT_API_URL}${path}`;
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(url, options);
      return await response.json();
    } catch (error) {
      console.error(`❌ Erro ao conectar com bot: ${error.message}`);
      throw new HttpException('Bot não disponível', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  async getStatus() {
    return this.proxyToBot('/api/status');
  }

  @Get('qr')
  @UseGuards(AuthGuard('jwt'))
  async getQR() {
    return this.proxyToBot('/api/qr');
  }

  @Post('pairing-code')
  @UseGuards(AuthGuard('jwt'))
  async getPairingCode(@Body() dto: { phoneNumber: string }) {
    return this.proxyToBot('/api/pairing-code', 'POST', dto);
  }

  @Post('disconnect')
  @UseGuards(AuthGuard('jwt'))
  async disconnect() {
    return this.proxyToBot('/api/disconnect', 'POST');
  }

  @Post('restart')
  @UseGuards(AuthGuard('jwt'))
  async restart() {
    return this.proxyToBot('/api/restart', 'POST');
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout() {
    return this.proxyToBot('/api/logout', 'POST');
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
      customerName?: string;
    },
  ) {
    const ticket = await this.prisma.ticket.create({
      data: {
        glpiId: dto.glpiId,
        title: dto.title,
        description: dto.description,
        phoneNumber: dto.phoneNumber,
        customerName: dto.customerName,
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

