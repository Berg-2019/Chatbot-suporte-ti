import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnModuleInit, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as cookie from 'cookie';
import * as jwt from 'jsonwebtoken';
import { RabbitMQService } from '../../infrastructure/messaging/rabbitmq.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

interface WsUser {
  id: string;
  email: string;
  role: string;
  sector: string;
}

const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim().toLowerCase().replace(/\/$/, ''))
  : [
      'https://ti.helpdeskmsm.com.br',
      'https://eletrica.helpdeskmsm.com.br',
      'https://compras.helpdeskmsm.com.br',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3001',
    ];

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.toLowerCase().replace(/\/$/, '');
      if (ALLOWED_ORIGINS.includes(normalized)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
})
export class EventsGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private rabbitmq: RabbitMQService,
    private prisma: PrismaService,
  ) {}

  private verifyClient(client: Socket): WsUser | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookie.parse(cookieHeader);
    const token = cookies['helpdesk_session'];
    if (!token) return null;

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        sector: payload.sector,
      };
    } catch {
      return null;
    }
  }

  async onModuleInit() {
    this.logger.log('EventsGateway onModuleInit — consumidor de notificacoes ativo');

    await this.rabbitmq.consume(
      RabbitMQService.QUEUES.NOTIFICATIONS,
      async (data) => {
        this.logger.debug(`WebSocket evento: ${data.type} ticket ${data.ticketId}`);
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

  async handleConnection(client: Socket) {
    const user = this.verifyClient(client);
    if (!user) {
      this.logger.warn(`conexao recusada (sem JWT valido): ${client.id}`);
      client.emit('error', { message: 'Autenticacao necessaria' });
      client.disconnect(true);
      return;
    }

    (client as any).user = user;
    this.logger.log(`cliente conectado: ${client.id} user=${user.id} sector=${user.sector}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).user?.id;
    this.logger.log(`cliente desconectado: ${client.id}`);
    if (userId) {
      await this.updateAgentStatus(userId, 'OFFLINE');
    }
  }

  @SubscribeMessage('ticket:subscribe')
  async handleSubscribe(client: Socket, ticketId: string) {
    const user: WsUser | undefined = (client as any).user;
    if (!user) {
      client.emit('error', { message: 'Nao autenticado' });
      return;
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { sector: true },
    });

    if (ticket && ticket.sector !== user.sector && !user.role.startsWith('ADMIN')) {
      this.logger.warn(`acesso negado: user ${user.id} (${user.sector}) tentou ticket ${ticketId} (${ticket.sector})`);
      client.emit('error', { message: 'Setor nao autorizado para este ticket' });
      return;
    }

    client.join(`ticket:${ticketId}`);
    this.logger.debug(`cliente ${client.id} inscrito no ticket ${ticketId}`);
  }

  @SubscribeMessage('ticket:unsubscribe')
  handleUnsubscribe(client: Socket, ticketId: string) {
    client.leave(`ticket:${ticketId}`);
  }

  @SubscribeMessage('team:join')
  handleJoinTeamChat(client: Socket) {
    const user: WsUser | undefined = (client as any).user;
    if (user) {
      client.join(`team-chat:${user.sector}`);
      this.logger.debug(`cliente ${client.id} entrou no team-chat:${user.sector}`);
    }
  }

  @SubscribeMessage('team:message')
  async handleTeamMessage(client: Socket, payload: { content: string; senderId: string }) {
    const user: WsUser | undefined = (client as any).user;
    if (!user) return;

    try {
      const message = await this.prisma.teamMessage.create({
        data: {
          content: payload.content,
          senderId: user.id,
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      });

      this.server.to(`team-chat:${user.sector}`).emit('team:message', message);
    } catch (error) {
      this.logger.error('Erro ao salvar mensagem do time', error);
    }
  }

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

  @SubscribeMessage('agent:identify')
  async handleAgentIdentify(client: Socket, _userId: string) {
    const user: WsUser | undefined = (client as any).user;
    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });
  }

  @SubscribeMessage('agent:status:update')
  async handleAgentStatusUpdate(
    client: Socket,
    payload: { userId: string; status: string },
  ) {
    const user: WsUser | undefined = (client as any).user;
    if (!user) return;
    await this.updateAgentStatus(user.id, payload.status as any);
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

      this.server.emit('agent:status:changed', updatedUser);
    } catch (error) {
      this.logger.error('Erro ao atualizar status do agente', error);
    }
  }

  emitAgentStatusChanged(agent: any) {
    this.server.emit('agent:status:changed', agent);
  }
}
