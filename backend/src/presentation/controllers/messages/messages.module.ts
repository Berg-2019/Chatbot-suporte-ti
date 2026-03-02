/**
 * Messages Module
 */

import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [AutomationModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
