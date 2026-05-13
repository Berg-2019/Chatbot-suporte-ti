import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  text: string;

  @IsOptional()
  @IsString()
  html?: string;
}

/**
 * Notifications transactional (envio sob demanda).
 *
 * Hoje é placeholder: aceita o payload, loga estruturado e retorna 202.
 * Quando SMTP estiver configurado, trocar pra envio real via nodemailer +
 * SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS do .env.
 *
 * Diferente de email-config (que controla IMAP ingestion de emails entrantes)
 * — este controller só envia OUT.
 */
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  private readonly logger = new Logger('Notifications');

  @Post('email')
  @HttpCode(202)
  async sendEmail(@Body() dto: SendEmailDto, @Req() req: any) {
    const requester = req.user?.email ?? 'unknown';
    const reqId =
      (req.headers['x-request-id'] as string | undefined) || 'no-trace';
    this.logger.log(
      `email queued by=${requester} to=${dto.to} subject="${dto.subject.slice(0, 60)}" reqId=${reqId}`,
    );
    // TODO: integrar nodemailer + SMTP. Por enquanto best-effort log only.
    return { queued: true, transport: 'log-only' };
  }
}
