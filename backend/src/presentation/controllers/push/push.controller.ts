import { Controller, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsObject, IsString } from 'class-validator';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString()
  endpoint: string;

  @IsObject()
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'))
  async subscribe(@Body() dto: SubscribeDto, @Request() req: any) {
    const userId = req.user.id;
    return this.pushService.subscribe(userId, dto);
  }

  @Post('unsubscribe')
  @UseGuards(AuthGuard('jwt'))
  async unsubscribe(@Body() body: { endpoint: string }) {
    return this.pushService.unsubscribe(body.endpoint);
  }
}