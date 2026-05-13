import { Body, Controller, Logger, Post, Req, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsString, IsIn } from 'class-validator';

class DevAuditAttemptDto {
  @IsString()
  @IsIn(['dev_login_attempt'])
  action: string;

  @IsBoolean()
  success: boolean;
}

/**
 * Endpoint público (sem auth) pra correlação de tentativas no dev console.
 * Não persiste em DB — apenas loga estruturadamente pra alimentar SIEM/grep.
 *
 * Rate limit: 10 req/min por IP (suficiente pra logar tentativas falhas
 * mesmo com bloqueio client-side de 5/30s).
 */
@Controller('dev')
export class DevController {
  private readonly logger = new Logger('DevAudit');

  @Post('audit-attempt')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async auditAttempt(@Body() dto: DevAuditAttemptDto, @Req() req: Request) {
    const reqId =
      (req.headers['x-request-id'] as string | undefined) || 'no-trace';
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const ua = (req.headers['user-agent'] as string | undefined) || 'unknown';
    const level = dto.success ? 'log' : 'warn';
    this.logger[level](
      `${dto.action} success=${dto.success} ip=${ip} reqId=${reqId} ua="${ua.slice(0, 80)}"`,
    );
    return;
  }
}
