import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const traceLocalStorage = new AsyncLocalStorage<{ requestId: string }>();

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    response.setHeader('X-Request-ID', requestId);

    return traceLocalStorage.run({ requestId }, () => next.handle());
  }
}

export function getRequestId(): string {
  return traceLocalStorage.getStore()?.requestId ?? 'unknown';
}
