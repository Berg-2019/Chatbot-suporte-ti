/**
 * Express App - Helpdesk Backend API
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import database from './config/database.js';
import whatsappService from './services/whatsapp.js';
import chatbotService from './services/chatbot.js';

// Rotas
import authRoutes from './routes/auth.js';
import botRoutes from './routes/bot.js';
import ticketsRoutes from './routes/tickets.js';
import chatsRoutes from './routes/chats.js';
import usersRoutes from './routes/users.js';
import queuesRoutes from './routes/queues.js';

import { infoLog, successLog, errorLog } from './utils/logger.js';

// Carregar variáveis de ambiente
dotenv.config();

const PORT = process.env.PORT || 3003;

/**
 * Cria e configura o app Express
 */
export function createApp(): { app: Express; server: ReturnType<typeof createServer>; io: SocketIOServer } {
  const app = express();
  const server = createServer(app);
  
  // Socket.IO para real-time
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      bot: whatsappService.getStatus(),
    });
  });

  // Rotas da API
  app.use('/api/auth', authRoutes);
  app.use('/api/bot', botRoutes);
  app.use('/api/tickets', ticketsRoutes);
  app.use('/api/chats', chatsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/queues', queuesRoutes);

  // Socket.IO eventos
  io.on('connection', (socket) => {
    infoLog(`Socket conectado: ${socket.id}`);

    // Enviar status inicial
    socket.emit('bot:status', whatsappService.getStatus());

    // Subscribe para eventos de ticket
    socket.on('ticket:subscribe', (ticketId: number) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on('ticket:unsubscribe', (ticketId: number) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on('disconnect', () => {
      infoLog(`Socket desconectado: ${socket.id}`);
    });
  });

  // Injetar Socket.IO nos serviços
  whatsappService.setSocketIO(io);
  chatbotService.setSocketIO(io);

  // Handler de mensagens do WhatsApp → Chatbot
  whatsappService.setMessageHandler(async (phone, text, msgId) => {
    await chatbotService.processMessage(phone, text, msgId);
  });

  return { app, server, io };
}

/**
 * Inicia o servidor
 */
export async function startServer(): Promise<void> {
  try {
    // Banner
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║   🎫 HELPDESK - Sistema de Atendimento Técnico               ║');
    console.log('║                                                                ║');
    console.log('║   Backend API + WhatsApp Bot                                  ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Inicializar banco
    infoLog('Inicializando banco de dados...');
    await database.initialize();

    // Criar app
    const { server } = createApp();

    // Iniciar servidor
    server.listen(PORT, () => {
      successLog(`Servidor rodando em http://localhost:${PORT}`);
      successLog('API pronta para conexões');
      infoLog('Use o painel web para conectar o WhatsApp');
    });
  } catch (error: any) {
    errorLog('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  errorLog('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  errorLog('Unhandled Rejection:', reason as Error);
});
