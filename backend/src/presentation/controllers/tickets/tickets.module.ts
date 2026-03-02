/**
 * Tickets Module
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TicketsController } from './tickets.controller';
import { BotTicketsController } from './bot-tickets.controller';
import { TicketsService } from './tickets.service';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [
    AutomationModule,
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
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [TicketsController, BotTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule { }
