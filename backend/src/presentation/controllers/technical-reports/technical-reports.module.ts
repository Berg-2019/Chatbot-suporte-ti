import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { TechnicalReportsController } from './technical-reports.controller';
import { TechnicalReportsService } from './technical-reports.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UPLOAD_LIMITS, uploadFileFilter } from '../../../common/upload/upload.config';

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
      limits: UPLOAD_LIMITS,
      fileFilter: uploadFileFilter,
    }),
  ],
  controllers: [TechnicalReportsController],
  providers: [TechnicalReportsService, PrismaService],
  exports: [TechnicalReportsService],
})
export class TechnicalReportsModule {}
