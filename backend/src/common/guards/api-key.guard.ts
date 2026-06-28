import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protege endpoints internos consumidos por integrações server-to-server
 * via header `x-api-key`. Lê INTERNAL_API_KEY.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('INTERNAL_API_KEY nao definida! Endpoints internos estao desprotegidos.');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-api-key'];

    if (!providedKey) {
      this.logger.warn(`Acesso a endpoint interno sem API Key de ${request.ip}`);
      throw new UnauthorizedException('API Key obrigatoria. Envie via header x-api-key.');
    }

    if (!this.apiKey) {
      this.logger.error('INTERNAL_API_KEY nao configurada — bloqueando todas as requisicoes');
      throw new UnauthorizedException('Servico nao configurado.');
    }

    if (providedKey !== this.apiKey) {
      this.logger.warn(`API Key invalida de ${request.ip}`);
      throw new UnauthorizedException('API Key invalida.');
    }

    return true;
  }
}
