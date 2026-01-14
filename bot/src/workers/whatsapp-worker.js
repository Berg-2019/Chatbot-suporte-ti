/**
 * WhatsApp Worker - Processa mensagens de saída
 */

import { config } from '../config/index.js';
import { rabbitmqService } from '../services/rabbitmq.js';
import { whatsappHandler } from '../handlers/whatsapp-handler.js';

class WhatsAppWorker {
  async start() {
    console.log('🚀 WhatsApp Worker iniciado');

    // Consumir fila de mensagens de saída
    await rabbitmqService.consume(
      config.queues.OUTGOING_MESSAGES,
      async (data) => {
        await this.processOutgoingMessage(data);
      }
    );
  }

  async processOutgoingMessage(data) {
    const { to, text, ticketId } = data;

    console.log(`📤 Enviando mensagem para ${to}: ${text.substring(0, 50)}...`);

    // Formatar JID se necessário
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    const success = await whatsappHandler.sendMessage(jid, text);

    if (success) {
      console.log(`✅ Mensagem enviada para ${to}`);
    } else {
      console.error(`❌ Falha ao enviar mensagem para ${to}`);
    }
  }
}

export const whatsappWorker = new WhatsAppWorker();
