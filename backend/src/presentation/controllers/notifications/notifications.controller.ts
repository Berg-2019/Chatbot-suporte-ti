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
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { MailService } from '../../../infrastructure/mail/mail.service';

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
 * Delega para MailService (SMTP real via nodemailer ou log-only dev).
 * Mantido por compatibilidade com o frontend/admin que já chamava este endpoint.
 */
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  private readonly logger = new Logger('Notifications');

  constructor(private readonly mail: MailService) {}

  @Post('email')
  @HttpCode(202)
  async sendEmail(@Body() dto: SendEmailDto, @Req() req: any) {
    const requester = req.user?.email ?? 'unknown';
    const reqId =
      (req.headers['x-request-id'] as string | undefined) || 'no-trace';
    const subjectShort = dto.subject.slice(0, 60);

    try {
      const result = await this.mail.sendMail({
        to: dto.to,
        subject: dto.subject,
        text: dto.text,
        html: dto.html,
      });
      this.logger.log(
        `email ${result.transport === 'log-only' ? 'DRY-RUN' : 'sent'} by=${requester} to=${dto.to} subject="${subjectShort}" reqId=${reqId}` +
          (result.messageId ? ` messageId=${result.messageId}` : ''),
      );
      return {
        queued: true,
        transport: result.transport,
        messageId: result.messageId,
      };
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
