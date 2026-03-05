/**
 * Enhanced Health Check Controller
 * Production-ready health monitoring
 */

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { EmailIngestionService } from '../../../infrastructure/email/email-ingestion.service';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    emailIngestion: ServiceHealth;
  };
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    process: {
      pid: number;
      uptime: number;
      nodeVersion: string;
    };
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  responseTime?: number;
  details?: any;
}

@Controller('health')
export class HealthControllerEnhanced {
  private startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private emailIngestion: EmailIngestionService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    // Check all services
    const [database, redis, emailIngestion] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkEmailIngestion(),
    ]);

    // Determine overall status
    const services = { database, redis, emailIngestion };
    const status = this.determineOverallStatus(services);

    // Collect metrics
    const memory = process.memoryUsage();

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      services,
      metrics: {
        memory: {
          used: Math.round(memory.heapUsed / 1024 / 1024), // MB
          total: Math.round(memory.heapTotal / 1024 / 1024), // MB
          percentage: Math.round((memory.heapUsed / memory.heapTotal) * 100),
        },
        process: {
          pid: process.pid,
          uptime: Math.round(process.uptime()),
          nodeVersion: process.version,
        },
      },
    };
  }

  @Get('ready')
  async getReadiness() {
    // Readiness probe - is the service ready to accept traffic?
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();

    const ready = database.status === 'up' && redis.status === 'up';

    return {
      ready,
      services: { database, redis },
    };
  }

  @Get('live')
  async getLiveness() {
    // Liveness probe - is the service alive?
    // Simple check - if we can respond, we're alive
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();

    try {
      // Simple query to check DB connection
      await this.prisma.$queryRaw`SELECT 1 as result`;

      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();

    try {
      // Try to set and get a test key
      const testKey = 'health:check';
      await this.redis.set(testKey, 'ok', 10);
      const value = await this.redis.get(testKey);

      if (value !== 'ok') {
        return {
          status: 'degraded',
          message: 'Redis read/write mismatch',
          responseTime: Date.now() - start,
        };
      }

      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkEmailIngestion(): Promise<ServiceHealth> {
    try {
      const health = this.emailIngestion.getHealthStatus();

      // Determine status based on circuit breaker
      let status: 'up' | 'down' | 'degraded' = 'up';

      if (health.circuitOpen) {
        status = 'down';
      } else if (health.failureCount > 0) {
        status = 'degraded';
      }

      return {
        status,
        message: health.circuitOpen
          ? 'Circuit breaker open'
          : health.failureCount > 0
          ? `${health.failureCount} recent failures`
          : 'Running normally',
        details: {
          isRunning: health.isRunning,
          isProcessing: health.isProcessing,
          totalProcessed: health.totalEmailsProcessed,
          totalErrors: health.totalErrors,
          lastSuccess: health.lastSuccessfulPoll,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  private determineOverallStatus(services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    emailIngestion: ServiceHealth;
  }): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map((s) => s.status);

    // If any critical service is down, system is unhealthy
    if (services.database.status === 'down' || services.redis.status === 'down') {
      return 'unhealthy';
    }

    // If any service is down or degraded, system is degraded
    if (statuses.includes('down') || statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }
}
