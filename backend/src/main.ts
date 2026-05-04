/**
 * Main Entry Point - NestJS Application
 */

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  app.use(cookieParser());

  // Increase payload limit
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

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

  // CORS - Multi-tenant (3 subdomains + dev ports)
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : [
      // Production subdomains
      'https://ti.helpdeskmsm.com.br',
      'https://eletrica.helpdeskmsm.com.br',
      'https://compras.helpdeskmsm.com.br',
      // Legacy
      'http://helpdeskmsm.com.br',
      'https://helpdeskmsm.com.br',
      // Dev (simulating subdomains via ports)
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3001',
    ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Normalize origin (remove trailing slash, lowercase)
      const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');
      const normalizedAllowed = allowedOrigins.map(o => o.toLowerCase().replace(/\/$/, ''));

      if (normalizedAllowed.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.log(`⚠️ CORS bloqueado para origin: "${origin}"`);
        console.log(`   Allowed origins:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Frontend-Sector'],
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

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   🎫 HELPDESK - Sistema de Atendimento Técnico               ║');
  console.log('║                                                                ║');
  console.log('║   Backend API - Helpdesk MSM                                   ║');
  console.log(`║   Rodando em: http://localhost:${port}                           ║`);
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

bootstrap();
