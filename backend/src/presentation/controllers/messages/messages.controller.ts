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
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { MessagesService } from './messages.service';

class CreateTicketMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

@Controller('tickets/:ticketId/messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private messagesService: MessagesService) { }

  @Get()
  async findByTicket(@Param('ticketId') ticketId: string) {
    return this.messagesService.findByTicket(ticketId);
  }

  @Post()
  async create(
    @Param('ticketId') ticketId: string,
    @Body() body: CreateTicketMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.createFromTechnician(
      ticketId,
      body.content,
      req.user.id,
      body.isInternal || false,
      body.mentions || [],
    );
  }
}
