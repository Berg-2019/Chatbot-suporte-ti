import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../cache/redis.module';
import { RabbitMQModule } from '../messaging/rabbitmq.module';
import { BaileysService } from './baileys.service';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  imports: [ConfigModule, RedisModule, RabbitMQModule],
  controllers: [WhatsAppController],
  providers: [BaileysService],
  exports: [BaileysService],
})
export class WhatsAppModule {}
