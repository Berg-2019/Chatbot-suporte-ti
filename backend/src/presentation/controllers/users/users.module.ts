/**
 * Users Module
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ExternalModule } from '../../../infrastructure/external/external.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [ExternalModule, OnboardingModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
