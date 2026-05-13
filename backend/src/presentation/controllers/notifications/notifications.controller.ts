import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import * as nodemailer from 'nodemailer';

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
 * Usa SMTP real via nodemailer quando SMTP_HOST + SMTP_USER + SMTP_PASS estão
 * setados nas env vars. Caso contrário, cai em modo log-only (placeholder
 * pra dev local sem credenciais).
 *
 * Hostinger SMTP (típico):
 *   SMTP_HOST=smtp.hostinger.com
 *   SMTP_PORT=465
 *   SMTP_SECURE=true        # true=SSL/465, false=STARTTLS/587
 *   SMTP_USER=helpdesk@seudominio.com.br
 *   SMTP_PASS=<senha do email>
 *   SMTP_FROM="Helpdesk MSM <helpdesk@seudominio.com.br>"
 */
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  private readonly logger = new Logger('Notifications');
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.bootstrapTransporter();
  }

  private bootstrapTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP_HOST/SMTP_USER/SMTP_PASS não configurados — modo log-only',
      );
      return;
    }
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = (process.env.SMTP_SECURE ?? 'true').toLowerCase() === 'true';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    // Verificar conexão em background (não bloqueia boot)
    this.transporter
      .verify()
      .then(() =>
        this.logger.log(
          `SMTP transporter conectado em ${host}:${port} (secure=${secure})`,
        ),
      )
      .catch((err: any) =>
        this.logger.error(`SMTP verify falhou: ${err.message}`),
      );
  }

  @Post('email')
  @HttpCode(202)
  async sendEmail(@Body() dto: SendEmailDto, @Req() req: any) {
    const requester = req.user?.email ?? 'unknown';
    const reqId =
      (req.headers['x-request-id'] as string | undefined) || 'no-trace';
    const subjectShort = dto.subject.slice(0, 60);

    if (!this.transporter) {
      this.logger.log(
        `email DRY-RUN (log-only) by=${requester} to=${dto.to} subject="${subjectShort}" reqId=${reqId}`,
      );
      return { queued: true, transport: 'log-only' };
    }

    const from =
      process.env.SMTP_FROM ||
      `Helpdesk MSM <${process.env.SMTP_USER}>`;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      });
      this.logger.log(
        `email sent by=${requester} to=${dto.to} subject="${subjectShort}" messageId=${info.messageId} reqId=${reqId}`,
      );
      return { queued: true, transport: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(
        `email FALHOU by=${requester} to=${dto.to} subject="${subjectShort}" reqId=${reqId} err="${err.message}"`,
      );
      throw new HttpException(
        { error: 'Falha ao enviar email', detail: err.message },
        502,
      );
    }
  }
}
