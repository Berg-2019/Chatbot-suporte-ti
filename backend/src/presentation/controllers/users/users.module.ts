/**
 * Users Module
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ExternalModule } from '../../../infrastructure/external/external.module';

@Module({
  imports: [ExternalModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
