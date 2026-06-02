import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../cache/redis.module';
import { RabbitMQModule } from '../messaging/rabbitmq.module';
import { PrismaModule } from '../database/prisma.module';
import { ServicesModule } from '../services/services.module';
import { IntentModule } from '../../presentation/controllers/intent/intent.module';
import { FaqModule } from '../../presentation/controllers/faq/faq.module';
import { ContactsModule } from '../../presentation/controllers/contacts/contacts.module';
import { MessagesModule } from '../../presentation/controllers/messages/messages.module';
import { WebsocketModule } from '../../presentation/websockets/websocket.module';
import { BaileysService } from './baileys.service';
import { FlowService } from './flow.service';
import { ConversationAIService } from './conversation-ai.service';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    RabbitMQModule,
    PrismaModule,
    ServicesModule,
    IntentModule,
    FaqModule,
    ContactsModule,
    MessagesModule,
    forwardRef(() => WebsocketModule),
  ],
  controllers: [WhatsAppController],
  providers: [BaileysService, FlowService, ConversationAIService],
  exports: [BaileysService, FlowService, ConversationAIService],
})
export class WhatsAppModule {}
