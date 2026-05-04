import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uuid()}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /^(image|video|audio|application)\//.test(file.mimetype);
        cb(ok ? null : new Error('Tipo de arquivo não permitido'), ok);
      },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
})
export class ChatModule {}