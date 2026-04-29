import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService, PrismaService],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}