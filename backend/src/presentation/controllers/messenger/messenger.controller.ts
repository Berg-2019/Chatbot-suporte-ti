import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessengerService } from './messenger.service';

@Controller('messenger')
@UseGuards(AuthGuard('jwt'))
export class MessengerController {
  constructor(private readonly service: MessengerService) {}

  @Get('conversations')
  list(@Req() req: any) {
    return this.service.listConversations(req.user);
  }

  @Get('conversations/:id/messages')
  messages(@Req() req: any, @Param('id') id: string) {
    return this.service.getMessages(req.user, id);
  }

  @Post('conversations/:id/read')
  read(@Req() req: any, @Param('id') id: string) {
    return this.service.markRead(req.user, id);
  }

  @Post('direct/:userId')
  direct(@Req() req: any, @Param('userId') userId: string) {
    return this.service.openDirect(req.user, userId);
  }

  @Get('contacts')
  contacts(@Req() req: any) {
    return this.service.getContacts(req.user);
  }
}
