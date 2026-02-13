/**
 * Bot Module
 */

import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { ServicesModule } from '../../../infrastructure/services/services.module';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { RedisModule } from '../../../infrastructure/cache/redis.module';
import { RabbitMQModule } from '../../../infrastructure/messaging/rabbitmq.module';

@Module({
  imports: [ServicesModule, PrismaModule, RedisModule, RabbitMQModule],
  controllers: [BotController],
})
export class BotModule { }
