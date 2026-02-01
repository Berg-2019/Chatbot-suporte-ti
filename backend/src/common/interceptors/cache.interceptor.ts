import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../infrastructure/cache/redis.service';

/**
 * HTTP Cache Interceptor
 * Automatically caches GET requests based on URL and query params
 *
 * Usage:
 * @UseInterceptors(new HttpCacheInterceptor(60)) // Cache for 60 seconds
 * @Get('tickets')
 * async findAll() { ... }
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly ttl: number = 60, // Default 60 seconds
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Generate cache key from URL and query params
    const cacheKey = this.generateCacheKey(request);

    // Try to get from cache
    const cachedResponse = await this.redisService.getCache(cacheKey);
    if (cachedResponse) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return of(cachedResponse);
    }

    console.log(`[Cache MISS] ${cacheKey}`);

    // Execute request and cache result
    return next.handle().pipe(
      tap(async (response) => {
        await this.redisService.setCache(cacheKey, response, this.ttl);
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const url = request.url;
    const userId = request.user?.id || 'anonymous';

    // Include user ID to prevent data leakage between users
    return `http:${userId}:${url}`;
  }
}
