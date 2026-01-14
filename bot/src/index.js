/**
 * Bot WhatsApp - Helpdesk
 * Entry Point
 */

import { config } from './config/index.js';
import { redisService } from './services/redis.js';
import { rabbitmqService } from './services/rabbitmq.js';
import { whatsappHandler } from './handlers/whatsapp-handler.js';
import { whatsappWorker } from './workers/whatsapp-worker.js';
import { glpiWorker } from './workers/glpi-worker.js';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║   🤖 HELPDESK BOT - WhatsApp + GLPI                           ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Conectar Redis
    console.log('📦 Conectando Redis...');
    await redisService.connect();

    // 2. Conectar RabbitMQ
    console.log('📦 Conectando RabbitMQ...');
    await rabbitmqService.connect();

    // 3. Iniciar workers
    console.log('⚙️ Iniciando workers...');
    await whatsappWorker.start();
    await glpiWorker.start();

    // 4. Conectar WhatsApp
    console.log('📱 Conectando WhatsApp...');
    await whatsappHandler.connect();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️ Encerrando bot...');
      await whatsappHandler.disconnect();
      await rabbitmqService.disconnect();
      await redisService.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️ Encerrando bot...');
      await whatsappHandler.disconnect();
      await rabbitmqService.disconnect();
      await redisService.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();
