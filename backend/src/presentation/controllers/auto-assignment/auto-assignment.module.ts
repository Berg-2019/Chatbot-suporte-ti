import { Module } from '@nestjs/common';
import { AutoAssignmentController } from './auto-assignment.controller';
import { AutoAssignmentService } from './auto-assignment.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AutoAssignmentController],
  providers: [AutoAssignmentService],
  exports: [AutoAssignmentService],
})
export class AutoAssignmentModule {}
