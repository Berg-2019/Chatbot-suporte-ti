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
            this.emitToSector(data.payload?.sector, 'ticket:created', data.payload);
            break;
          case 'ticket_assigned':
            this.emitToSector(data.payload?.sector, 'ticket:assigned', data.payload);
            break;
          case 'ticket_updated':
            this.emitToSector(data.payload?.sector, 'ticket:updated', data.payload);
            break;
          case 'new_message':
            this.server.to(`ticket:${data.ticketId}`).emit('message:new', data.payload);
            break;
          case 'human_requested':
            this.emitToSector(data.payload?.sector, 'human:requested', data.payload);
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

    // Sala por setor para eventos de ticket (isolamento multi-tenant).
    // ADMIN global é cross-sector → entra em todas; demais só no próprio setor.
    if (user.role === 'ADMIN') {
      for (const s of ['TI', 'ELECTRIC', 'COMPRAS']) client.join(`sector:${s}`);
    } else if (user.sector) {
      client.join(`sector:${user.sector}`);
    }

    // Sala pessoal — entrega de mensagens do messenger (grupos + DMs).
    client.join(`user:${user.id}`);

    this.logger.log(`cliente conectado: ${client.id} user=${user.id} sector=${user.sector}`);
  }

  /**
   * Emite um evento apenas para os clientes do setor (room `sector:<setor>`).
   * Sem setor no payload, não faz broadcast global (evita vazamento cross-tenant).
   */
  private emitToSector(sector: string | undefined, event: string, payload: any) {
    if (!sector) {
      this.logger.warn(`evento ${event} sem sector no payload — não emitido (evita broadcast global)`);
      return;
    }
    this.server.to(`sector:${sector}`).emit(event, payload);
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

  // Messenger interno (grupos de setor + DMs). Entrega nas salas `user:<id>`
  // de todos os participantes (remetente inclusive → sem optimistic no front).
  @SubscribeMessage('chat:send')
  async handleChatSend(client: Socket, payload: { conversationId: string; content: string }) {
    const user: WsUser | undefined = (client as any).user;
    if (!user) return;
    const content = (payload?.content || '').trim();
    const conversationId = payload?.conversationId;
    if (!content || !conversationId) return;

    try {
      // Anti-IDOR: só participa quem está na conversa.
      const part = await this.prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: user.id } },
      });
      if (!part) return;

      const message = await this.prisma.chatMessage.create({
        data: { conversationId, senderId: user.id, content },
        include: { sender: { select: { id: true, name: true } } },
      });
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      const participants = await this.prisma.chatParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });
      const summary = {
        conversationId,
        lastMessage: {
          content: message.content,
          senderName: message.sender?.name ?? null,
          createdAt: message.createdAt,
        },
      };
      for (const p of participants) {
        this.server.to(`user:${p.userId}`).emit('chat:message', message);
        this.server.to(`user:${p.userId}`).emit('chat:conversation', summary);
      }
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem do messenger', error);
    }
  }

  emitTicketCreated(ticket: any) {
    this.emitToSector(ticket?.sector, 'ticket:created', ticket);
  }

  emitTicketAssigned(ticket: any) {
    this.emitToSector(ticket?.sector, 'ticket:assigned', ticket);
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
