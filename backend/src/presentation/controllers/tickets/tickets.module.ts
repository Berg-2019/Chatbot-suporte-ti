/**
 * Tickets Module
 */

import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { BotTicketsController } from './bot-tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, BotTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule { }
