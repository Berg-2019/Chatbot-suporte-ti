import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BaileysService } from './baileys.service';

@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WhatsAppController {
  constructor(private readonly baileys: BaileysService) {}

  @Get('status')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'DEV')
  getStatus() {
    const status = this.baileys.getStatus();
    return {
      ...status,
      qrCode: undefined,
    };
  }

  @Get('qr')
  @Roles('ADMIN', 'ADMIN_TI', 'DEV')
  getQrCode() {
    const qr = this.baileys.getQrCode();
    return {
      available: !!qr,
      qrCode: qr,
    };
  }

  @Post('disconnect')
  @HttpCode(200)
  @Roles('ADMIN', 'ADMIN_TI', 'DEV')
  async disconnect() {
    await this.baileys.disconnect();
    return { ok: true, message: 'WhatsApp desconectado' };
  }

  @Post('restart')
  @HttpCode(200)
  @Roles('ADMIN', 'ADMIN_TI', 'DEV')
  async restart() {
    await this.baileys.restart();
    return { ok: true, message: 'WhatsApp reiniciando' };
  }
}
