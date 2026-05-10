/**
 * Idempotency Interceptor
 *
 * Evita duplicação de operações POST em caso de retry do cliente.
 * Usa header `Idempotency-Key: <uuid>` — o cliente deve gerar um UUID v4 por requisição.
 *
 * Armazena resultado em Redis com TTL de 24h.
 * Se a mesma key for recebida novamente, retorna o resultado cacheado.
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    private readonly logger = new Logger(IdempotencyInterceptor.name);
    private readonly TTL_SECONDS = 24 * 60 * 60; // 24h

    constructor(private readonly redis: RedisService) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<unknown>> {
        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['idempotency-key'];

        if (!idempotencyKey) {
            return next.handle();
        }

        if (typeof idempotencyKey !== 'string' || idempotencyKey.length > 64) {
            throw new HttpException(
                'Idempotency-Key inválido (deve ser string com até 64 caracteres)',
                HttpStatus.BAD_REQUEST,
            );
        }

        const cacheKey = `idempotency:${idempotencyKey}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                this.logger.debug(`Idempotency HIT: ${idempotencyKey}`);
                return of(JSON.parse(cached));
            }
        } catch {
            // Redis unavailable — proceed without idempotency
            this.logger.warn('Redis indisponível — pulando idempotência');
            return next.handle();
        }

        return next.handle().pipe(
            tap(async (response) => {
                try {
                    await this.redis.set(
                        cacheKey,
                        JSON.stringify(response),
                        this.TTL_SECONDS,
                    );
                } catch {
                    this.logger.warn('Redis indisponível — não foi possível armazenar idempotency result');
                }
            }),
        );
    }
}
