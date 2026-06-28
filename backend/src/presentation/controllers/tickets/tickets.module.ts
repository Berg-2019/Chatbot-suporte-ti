/**
 * Tickets Module
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { AutomationModule } from '../automation/automation.module';
import { SlaModule } from '../sla/sla.module';
import { PushModule } from '../push/push.module';
import { StockModule } from '../stock/stock.module';
import { ChatModule } from '../chat/chat.module';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisModule } from '../../../infrastructure/cache/redis.module';
import { UPLOAD_LIMITS, uploadFileFilter } from '../../../common/upload/upload.config';

@Module({
  imports: [
    AutomationModule,
    SlaModule,
    PushModule,
    StockModule,
    ChatModule,
    RedisModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/attachments',
        filename: (req: any, file: any, callback: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: UPLOAD_LIMITS,
      fileFilter: uploadFileFilter,
    }),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService],
  exports: [TicketsService],
})
export class TicketsModule { }
