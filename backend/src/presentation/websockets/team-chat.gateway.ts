import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TeamChatService } from '../controllers/team-chat.service';
import { JwtService } from '@nestjs/jwt';
import { Sector } from '@prisma/client';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/team-chat',
})
export class TeamChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(
        private service: TeamChatService,
        private jwt: JwtService,
    ) { }

    // Join clients to sector-specific rooms
    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token;
            if (token) {
                const payload = this.jwt.verify(token);
                const sector = (payload.sector || 'TI') as Sector;
                client.join(`team-chat:${sector}`);
                console.log(`Client ${client.id} joined room team-chat:${sector}`);
            }
        } catch (e) {
            console.error('Invalid token in WebSocket connection', e);
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() payload: { content: string; userId: string; sector?: string },
        @ConnectedSocket() client: Socket,
    ) {
        const sector = (payload.sector || 'TI') as Sector;
        const message = await this.service.saveMessage(payload.userId, payload.content, sector);

        // Broadcast to all connected clients in the sector-specific room
        this.server.to(`team-chat:${sector}`).emit('newMessage', message);

        return message;
    }
}
