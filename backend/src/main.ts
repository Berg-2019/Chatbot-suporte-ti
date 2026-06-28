/**
 * Main Entry Point - NestJS Application
 */

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';

const logger = new Logger('Bootstrap');

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

  // Limite de payload JSON/urlencoded. Uploads de arquivo passam por multer
  // (não por estes parsers), então 2mb é suficiente e corta superfície de DoS.
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // Security headers with Helmet
  // CSP estrita: bloqueia plugins, frames, base hijacking e form hijacking.
  // unsafe-inline em style é necessário pra MUI/Tailwind runtime; script-src
  // fica em 'self' (sem unsafe-inline/unsafe-eval).
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https:', 'wss:'],
        mediaSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow WebSocket connections
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
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
      'http://localhost',
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
        logger.warn(`CORS bloqueado para origin: "${origin}"`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Frontend-Sector', 'X-Request-ID', 'x-api-key'],
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
  console.log('║   Backend API - Helpdesk MSM                                   ║');
  console.log(`║   Rodando em: http://localhost:${port}                           ║`);
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

bootstrap();
