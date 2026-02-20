import { Module } from '@nestjs/common';
import { CannedResponsesController } from './canned-responses.controller';
import { CannedResponseService } from '../../../infrastructure/services/canned-response.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CannedResponsesController],
  providers: [CannedResponseService],
  exports: [CannedResponseService],
})
export class CannedResponsesModule {}
