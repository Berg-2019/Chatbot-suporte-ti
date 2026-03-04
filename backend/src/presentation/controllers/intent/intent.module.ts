import { Module } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { IntentService } from './intent.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntentController],
  providers: [IntentService],
  exports: [IntentService], // Exportar para usar no bot
})
export class IntentModule {}
