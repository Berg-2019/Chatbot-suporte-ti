/**
 * Events Gateway - Socket.IO para real-time
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RabbitMQService } from '../../infrastructure/messaging/rabbitmq.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private rabbitmq: RabbitMQService,
    private prisma: PrismaService,
  ) {
    console.log('🏗️ EventsGateway Constructor called');
  }

  async onModuleInit() {
    console.log('✅ EventsGateway onModuleInit - Inicializando consumidor');

    // Consumir notificações do RabbitMQ e repassar via Socket.IO
    await this.rabbitmq.consume(
      RabbitMQService.QUEUES.NOTIFICATIONS,
      async (data) => {
        console.log(`📨 WebSocket Evento Recebido: ${data.type} para ticket ${data.ticketId}`);
        switch (data.type) {
          case 'ticket_created':
            this.server.emit('ticket:created', data.payload);
            break;
          case 'ticket_assigned':
            this.server.emit('ticket:assigned', data.payload);
            break;
          case 'ticket_updated':
            this.server.emit('ticket:updated', data.payload);
            break;
          case 'new_message':
            console.log(`📤 Emitindo message:new para sala ticket:${data.ticketId}`);
            this.server.to(`ticket:${data.ticketId}`).emit('message:new', data.payload);
            break;
          case 'human_requested':
            this.server.emit('human:requested', data.payload);
            break;
        }
      },
    );
  }

  async handleConnection(client: Socket) {
    console.log(`📥 Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`📤 Cliente desconectado: ${client.id}`);

    // Se cliente tinha userId, marca como offline
    const userId = (client as any).userId;
    if (userId) {
      await this.updateAgentStatus(userId, 'OFFLINE');
    }
  }

  @SubscribeMessage('ticket:subscribe')
  handleSubscribe(client: Socket, ticketId: string) {
    client.join(`ticket:${ticketId}`);
    console.log(`👁️ Cliente ${client.id} inscrito no ticket ${ticketId}`);
  }

  @SubscribeMessage('ticket:unsubscribe')
  handleUnsubscribe(client: Socket, ticketId: string) {
    client.leave(`ticket:${ticketId}`);
    console.log(`👁️ Cliente ${client.id} saiu do ticket ${ticketId}`);
  }

  // --- Chat Interno da Equipe ---

  @SubscribeMessage('team:join')
  handleJoinTeamChat(client: Socket) {
    client.join('team-chat');
    console.log(`👥 Cliente ${client.id} entrou no chat da equipe`);
  }

  @SubscribeMessage('team:message')
  async handleTeamMessage(client: Socket, payload: { content: string; senderId: string }) {
    try {
      // Salvar no banco
      const message = await this.prisma.teamMessage.create({
        data: {
          content: payload.content,
          senderId: payload.senderId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            }
          }
        }
      });

      // Broadcast para sala 'team-chat'
      this.server.to('team-chat').emit('team:message', message);

    } catch (error) {
      console.error('Erro ao salvar mensagem do time:', error);
    }
  }

  // --- Fim Chat Interno ---

  // Métodos para emitir eventos programaticamente
  emitTicketCreated(ticket: any) {
    this.server.emit('ticket:created', ticket);
  }

  emitTicketAssigned(ticket: any) {
    this.server.emit('ticket:assigned', ticket);
  }

  emitNewMessage(ticketId: string, message: any) {
    this.server.to(`ticket:${ticketId}`).emit('message:new', message);
  }

  emitBotStatus(status: any) {
    this.server.emit('bot:status', status);
  }

  // --- Status do Agente ---

  @SubscribeMessage('agent:identify')
  async handleAgentIdentify(client: Socket, userId: string) {
    (client as any).userId = userId;
    console.log(`🆔 Agente ${userId} identificado no socket ${client.id}`);

    // Atualizar lastSeenAt
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  @SubscribeMessage('agent:status:update')
  async handleAgentStatusUpdate(
    client: Socket,
    payload: { userId: string; status: string },
  ) {
    const { userId, status } = payload;

    await this.updateAgentStatus(userId, status as any);
  }

  async updateAgentStatus(userId: string, status: string) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: status as any,
          lastStatusChange: new Date(),
          lastSeenAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          lastStatusChange: true,
          sector: true,
          role: true,
        },
      });

      // Broadcast para todos os clientes
      this.server.emit('agent:status:changed', updatedUser);
      console.log(`📊 Status do agente ${updatedUser.name} alterado para ${status}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status do agente:', error);
    }
  }

  // Método para emitir mudança de status programaticamente
  emitAgentStatusChanged(agent: any) {
    this.server.emit('agent:status:changed', agent);
  }
}
