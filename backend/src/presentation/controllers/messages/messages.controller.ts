/**
 * Messages Controller
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';

@Controller('tickets/:ticketId/messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async findByTicket(@Param('ticketId') ticketId: string) {
    return this.messagesService.findByTicket(ticketId);
  }

  @Post()
  async create(
    @Param('ticketId') ticketId: string,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    return this.messagesService.createFromTechnician(
      ticketId,
      content,
      req.user.id,
    );
  }
}
