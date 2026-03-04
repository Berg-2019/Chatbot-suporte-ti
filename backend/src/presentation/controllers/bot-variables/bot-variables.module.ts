import { Module } from '@nestjs/common';
import { BotVariablesController } from './bot-variables.controller';
import { BotVariablesService } from './bot-variables.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BotVariablesController],
  providers: [BotVariablesService],
  exports: [BotVariablesService], // Exportar para usar no bot
})
export class BotVariablesModule {}
