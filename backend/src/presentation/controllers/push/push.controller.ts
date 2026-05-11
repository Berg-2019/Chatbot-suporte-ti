import { Controller, Get, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
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

class UnsubscribeDto {
  @IsString()
  endpoint: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  @UseGuards(AuthGuard('jwt'))
  async getVapidPublicKey() {
    const key = process.env.VAPID_PUBLIC_KEY || '';
    return { key };
  }

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'))
  async subscribe(@Body() dto: SubscribeDto, @Request() req: any) {
    const userId = req.user.id;
    return this.pushService.subscribe(userId, dto);
  }

  @Post('unsubscribe')
  @UseGuards(AuthGuard('jwt'))
  async unsubscribe(@Body() body: UnsubscribeDto) {
    return this.pushService.unsubscribe(body.endpoint);
  }
}