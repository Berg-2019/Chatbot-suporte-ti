/**
 * Auto-Assignment Module
 */

import { Module } from '@nestjs/common';
import { AutoAssignmentController } from './auto-assignment.controller';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AutoAssignmentController],
})
export class AutoAssignmentModule {}
