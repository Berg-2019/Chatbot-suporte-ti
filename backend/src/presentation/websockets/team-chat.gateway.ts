import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TeamChatService } from '../controllers/team-chat.service';
import { JwtService } from '@nestjs/jwt';
import { Sector } from '@prisma/client';
import * as cookie from 'cookie';

const ALLOWED_ORIGINS = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o: string) => o.trim().toLowerCase().replace(/\/$/, ''))
    : [
        'https://ti.helpdeskmsm.com.br',
        'https://eletrica.helpdeskmsm.com.br',
        'https://compras.helpdeskmsm.com.br',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3001',
    ];

interface SendMessagePayload {
    content: string;
    userId: string;
    sector?: string;
}

@WebSocketGateway({
    cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
    namespace: '/team-chat',
})
export class TeamChatGateway implements OnGatewayConnection {
    private readonly logger = new Logger(TeamChatGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(
        private service: TeamChatService,
        private jwtService: JwtService,
    ) {}

    async handleConnection(client: Socket) {
        let payload: any = null;

        const cookieHeader = client.handshake.headers.cookie;
        if (cookieHeader) {
            const cookies = cookie.parse(cookieHeader);
            const token = cookies['helpdesk_session'];
            if (token) {
                try {
                    payload = this.jwtService.verify(token);
                } catch (_e) {
                    this.logger.warn(`JWT invalido no cookie: ${client.id}`);
                }
            }
        }

        if (!payload) {
            const authToken = client.handshake.auth?.token;
            if (authToken) {
                try {
                    payload = this.jwtService.verify(authToken);
                } catch (_e) {
                    this.logger.warn(`conexao recusada (JWT invalido): ${client.id}`);
                    client.disconnect(true);
                    return;
                }
            }
        }

        if (!payload) {
            this.logger.warn(`conexao recusada (sem JWT): ${client.id}`);
            client.disconnect(true);
            return;
        }

        const sector = (payload.sector || 'TI') as Sector;
        (client as any).user = { id: payload.sub, sector, role: payload.role };
        client.join('team-chat:' + sector);
        this.logger.debug('cliente ' + client.id + ' autenticado, room team-chat:' + sector);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() payload: SendMessagePayload,
        @ConnectedSocket() client: Socket,
    ) {
        const user = (client as any).user;
        if (!user) return;

        const sector = user.sector as Sector;
        const message = await this.service.saveMessage(user.id, payload.content, sector);

        this.server.to('team-chat:' + sector).emit('newMessage', message);

        return message;
    }
}
