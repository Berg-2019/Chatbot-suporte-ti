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
    this.apiKey = this.configService.get<string>('HERMES_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('HERMES_API_KEY nao definida! Endpoints do Hermes estao desprotegidos.');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-api-key'] || request.headers['x-hermes-api-key'];

    if (!providedKey) {
      this.logger.warn(`Acesso ao Hermes sem API Key de ${request.ip}`);
      throw new UnauthorizedException('API Key obrigatoria. Envie via header x-api-key.');
    }

    if (!this.apiKey) {
      this.logger.error('HERMES_API_KEY nao configurada — bloqueando todas as requisicoes');
      throw new UnauthorizedException('Servico nao configurado.');
    }

    if (providedKey !== this.apiKey) {
      this.logger.warn(`API Key invalida de ${request.ip}`);
      throw new UnauthorizedException('API Key invalida.');
    }

    return true;
  }
}
