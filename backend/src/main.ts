/**
 * Main Entry Point - NestJS Application
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable gzip compression
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses > 1KB
  }));

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow WebSocket connections
  }));

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS - More restrictive configuration
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:3001'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  });

  // Validation pipe with sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip properties without decorators
      forbidNonWhitelisted: true, // Throw error if unknown properties are present
      transform: true,            // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide error details in production
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   🎫 HELPDESK - Sistema de Atendimento Técnico               ║');
  console.log('║                                                                ║');
  console.log('║   Backend API + GLPI Integration                              ║');
  console.log(`║   Rodando em: http://localhost:${port}                           ║`);
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

bootstrap();
