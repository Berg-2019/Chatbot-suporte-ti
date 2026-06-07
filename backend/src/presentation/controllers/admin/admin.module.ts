import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LogsController } from './logs.controller';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [PrismaModule, OnboardingModule],
  controllers: [AdminController, LogsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
