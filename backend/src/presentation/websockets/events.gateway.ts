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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private rabbitmq: RabbitMQService) {}

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
          case 'new_message':
            this.server.to(`ticket:${data.ticketId}`).emit('message:new', data.payload);
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
