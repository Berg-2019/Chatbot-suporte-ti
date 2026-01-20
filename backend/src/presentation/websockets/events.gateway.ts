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
import { Server, Socket } from 'socket.io';
import { RabbitMQService } from '../../infrastructure/messaging/rabbitmq.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private rabbitmq: RabbitMQService,
    private prisma: PrismaService,
  ) { }

  afterInit() {
    console.log('✅ WebSocket Gateway inicializado');

    // Consumir notificações do RabbitMQ e repassar via Socket.IO
    this.rabbitmq.consume(
      RabbitMQService.QUEUES.NOTIFICATIONS,
      async (data) => {
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
            this.server.to(`ticket:${data.ticketId}`).emit('message:new', data.payload);
            break;
          case 'human_requested':
            this.server.emit('human:requested', data.payload);
            break;
        }
      },
    );
  }

  handleConnection(client: Socket) {
    console.log(`📥 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`📤 Cliente desconectado: ${client.id}`);
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
}
