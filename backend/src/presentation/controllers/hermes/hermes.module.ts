/**
 * Hermes Integration Module
 * 
 * Módulo NestJS para integração com Hermes Agent.
 * Expõe endpoints protegidos por API Key para criação de tickets,
 * busca de FAQ, gerenciamento de estoque, e escalação.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HermesController } from './hermes.controller';
import { HermesService } from './hermes.service';
import { HermesApiKeyGuard } from './guards/hermes-api-key.guard';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { ServicesModule } from '../../../infrastructure/services/services.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ServicesModule,
  ],
  controllers: [HermesController],
  providers: [
    HermesService,
    HermesApiKeyGuard,
  ],
  exports: [HermesService],
})
export class HermesModule {}
