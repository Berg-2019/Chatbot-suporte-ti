import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { TechnicalReportsController } from './technical-reports.controller';
import { TechnicalReportsService } from './technical-reports.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/reports',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uuid()}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /^(image|video)\//.test(file.mimetype);
        cb(ok ? null : new Error('Tipo de arquivo não permitido'), ok);
      },
    }),
  ],
  controllers: [TechnicalReportsController],
  providers: [TechnicalReportsService, PrismaService],
  exports: [TechnicalReportsService],
})
export class TechnicalReportsModule {}
