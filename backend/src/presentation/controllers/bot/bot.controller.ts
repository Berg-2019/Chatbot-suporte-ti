/**
 * Bot Controller - Status e controle do bot WhatsApp
 * O bot roda em container separado, aqui faz proxy para os endpoints do bot
 */

import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus, Res, Param, SetMetadata, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AlertService } from '../../../infrastructure/services/alert.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';

const BOT_API_URL = process.env.BOT_API_URL || 'http://bot:3002';


// ...

@Controller('bot')
export class BotController {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    private config: ConfigService,
    private alertService: AlertService,
    private rabbitmq: RabbitMQService, // Injected RabbitMQService
  ) { }

  @Get('status')
  async getStatus() {
    try {
      const response = await axios.get(`${BOT_API_URL}/api/status`);
      return response.data;
    } catch (e) {
      // Se não conseguir conectar, retorna status disconnected em vez de erro 500
      return {
        status: 'disconnected',
        uptime: 0,
        messagesReceived: 0,
        messagesSent: 0
      };
    }
  }

  @Get('qr')
  async getQRCode() {
    try {
      const response = await axios.get(`${BOT_API_URL}/api/qr`);
      return response.data;
    } catch (e) {
      throw new HttpException('Falha ao obter QR Code', HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('pairing-code')
  async generatePairingCode(@Body() body: { phoneNumber: string }) {
    try {
      const response = await axios.post(`${BOT_API_URL}/api/pairing-code`, body);
      return response.data;
    } catch (e) {
      throw new HttpException(e.response?.data?.error || 'Falha ao gerar código', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('disconnect')
  async disconnect() {
    try {
      const response = await axios.post(`${BOT_API_URL}/api/disconnect`);
      return response.data;
    } catch (e) {
      throw new HttpException('Falha ao desconectar', HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('restart')
  async restart() {
    try {
      const response = await axios.post(`${BOT_API_URL}/api/restart`);
      return response.data;
    } catch (e) {
      throw new HttpException('Falha ao reiniciar', HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('logout')
  async logout() {
    try {
      const response = await axios.post(`${BOT_API_URL}/api/logout`);
      return response.data;
    } catch (e) {
      throw new HttpException('Falha ao fazer logout', HttpStatus.BAD_GATEWAY);
    }
  }

  // ...

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

    // ALERTAR TÉCNICOS N1
    // Using Promise.all so we don't block the response significantly if alerts take time
    // though alertService.sendAlertToLevel is async, we await it.
    // We should ensure this doesn't timeout the bot.
    await this.alertService.sendAlertToLevel('N1', {
      ticketId: ticket.id,
      glpiId: ticket.glpiId ?? undefined,
      type: 'NEW_TICKET',
      title: '🎫 Novo Chamado (Bot)',
      message: `Novo chamado GLPI #${dto.glpiId}: ${dto.title}\nCliente: ${dto.customerName || 'N/A'}\nSetor: ${dto.sector || 'N/A'}`,
      priority: 'NORMAL',
    });

    // NOTIFICAR DASHBOARD (CRITICAL FIX: This was missing!)
    await this.rabbitmq.publishNotification({
      type: 'ticket_created',
      ticketId: ticket.id,
      payload: ticket,
    });

    return ticket;
  }

  @Post('users/link')
  async linkUserToWhatsapp(@Body() dto: { identifier: string; waId: string }) {
    // Buscar usuário por email ou nome (case insensitive)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: dto.identifier, mode: 'insensitive' } },
          { name: { contains: dto.identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Atualizar JID do WhatsApp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { phoneNumber: dto.waId },
    });

    console.log(`✅ Técnico vinculado: ${user.name} -> ${dto.waId}`);

    return {
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  @Get('media/:filename')
  @SetMetadata('isPublic', true)
  async getMedia(@Param('filename') filename: string, @Res() res: Response) {
    const url = `${BOT_API_URL}/media/${filename}`;
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      res.setHeader('Content-Type', response.headers['content-type']);
      response.data.pipe(res);
    } catch (e) {
      throw new NotFoundException('Mídia não encontrada');
    }
  }
}

