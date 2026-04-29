import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { LogsController } from './logs.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  controllers: [AdminController, LogsController],
  providers: [PrismaService],
})
export class AdminModule {}