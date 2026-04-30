import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PushModule],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService, PrismaService],
  exports: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}