import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PushModule } from '../push/push.module';
import { UPLOAD_LIMITS, uploadFileFilter } from '../../../common/upload/upload.config';

@Module({
  imports: [
    PushModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uuid()}${ext}`);
        },
      }),
      limits: UPLOAD_LIMITS,
      fileFilter: uploadFileFilter,
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
