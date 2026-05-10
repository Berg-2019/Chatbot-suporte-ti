/**
 * Audit Interceptor
 *
 * Registra todas as operações HTTP autenticadas em AuditLog (LGPD Art. 37).
 * Aplica-se a todos os endpoints que passam por JwtAuthGuard.
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../domain/auth-user';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);
    private audit: AuditService;

    constructor(audit: AuditService) {
        this.audit = audit;
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        const user = request.user as AuthUser | undefined;
        const { method, originalUrl } = request;
        const ipAddress = request.ip || request.headers['x-forwarded-for'] || '';
        const userAgent = request.headers['user-agent'] || '';

        const [resource, resourceId] = this.extractResource(originalUrl);

        return next.handle().pipe(
            tap({
                next: () => {
                    this.audit.log({
                        userId: user?.id,
                        userEmail: user?.email,
                        action: method,
                        resource,
                        resourceId,
                        method: context.getHandler().name,
                        path: originalUrl,
                        ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : String(ipAddress),
                        userAgent,
                        statusCode: response.statusCode,
                    });
                },
                error: (error) => {
                    this.audit.log({
                        userId: user?.id,
                        userEmail: user?.email,
                        action: method,
                        resource,
                        resourceId,
                        method: context.getHandler().name,
                        path: originalUrl,
                        ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : String(ipAddress),
                        userAgent,
                        statusCode: error.status || 500,
                        metadata: { error: error.message },
                    });
                },
            }),
        );
    }

    private extractResource(url: string): [string, string | undefined] {
        const parts = url.replace('/api/', '').split('/');
        const resource = parts[0] || 'unknown';
        const resourceId = parts.length > 1 && this.isUuid(parts[1]) ? parts[1] : undefined;
        return [resource, resourceId];
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }
}