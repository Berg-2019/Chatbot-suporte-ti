import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TeamChatService } from '../controllers/team-chat.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/team-chat',
})
export class TeamChatGateway {
    @WebSocketServer()
    server: Server;

    constructor(private service: TeamChatService) { }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() payload: { content: string; userId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const message = await this.service.saveMessage(payload.userId, payload.content);

        // Broadcast to all connected clients in the namespace
        this.server.emit('newMessage', message);

        return message;
    }
}
