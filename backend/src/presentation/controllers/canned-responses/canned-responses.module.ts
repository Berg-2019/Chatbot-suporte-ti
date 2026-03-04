import { Module } from '@nestjs/common';
import { CannedResponsesController } from './canned-responses.controller';
import { CannedResponseService } from '../../../infrastructure/services/canned-response.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
// import { RolesModule } from '../roles/roles.module';  // DISABLED - requires customRole model

@Module({
  // imports: [PrismaModule, RolesModule],  // DISABLED - requires customRole model
  controllers: [CannedResponsesController],
  providers: [CannedResponseService],
  exports: [CannedResponseService],
})
export class CannedResponsesModule {}
