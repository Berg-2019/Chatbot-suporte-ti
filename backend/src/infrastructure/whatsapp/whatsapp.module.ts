import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../cache/redis.module';
import { RabbitMQModule } from '../messaging/rabbitmq.module';
import { PrismaModule } from '../database/prisma.module';
import { IntentModule } from '../../presentation/controllers/intent/intent.module';
import { FaqModule } from '../../presentation/controllers/faq/faq.module';
import { BaileysService } from './baileys.service';
import { FlowService } from './flow.service';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  imports: [ConfigModule, RedisModule, RabbitMQModule, PrismaModule, IntentModule, FaqModule],
  controllers: [WhatsAppController],
  providers: [BaileysService, FlowService],
  exports: [BaileysService, FlowService],
})
export class WhatsAppModule {}
