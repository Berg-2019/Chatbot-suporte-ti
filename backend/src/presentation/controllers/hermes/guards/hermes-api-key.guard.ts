/**
 * Guard de autenticação por API Key para endpoints do Hermes Agent.
 * 
 * Verifica o header 'x-api-key' contra a variável de ambiente HERMES_API_KEY.
 * Se HERMES_API_KEY não estiver definida, usa uma chave padrão de desenvolvimento.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HermesApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(HermesApiKeyGuard.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('HERMES_API_KEY') || 'hermes_dev_key_change_me';

    if (this.apiKey === 'hermes_dev_key_change_me') {
      this.logger.warn('⚠️ HERMES_API_KEY não definida! Usando chave padrão de dev. Configure no .env para produção.');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-api-key'] || request.query?.api_key;

    if (!providedKey) {
      this.logger.warn(`🔒 Acesso ao Hermes sem API Key de ${request.ip}`);
      throw new UnauthorizedException('API Key obrigatória. Envie via header x-api-key.');
    }

    if (providedKey !== this.apiKey) {
      this.logger.warn(`🔒 API Key inválida de ${request.ip}`);
      throw new UnauthorizedException('API Key inválida.');
    }

    return true;
  }
}
