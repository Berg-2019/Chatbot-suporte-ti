/**
 * WhatsApp Worker - Processa mensagens de saída
 */

import { config } from '../config/index.js';
import { rabbitmqService } from '../services/rabbitmq.js';
import { redisService } from '../services/redis.js';
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
    const phone = jid.split('@')[0];

    const success = await whatsappHandler.sendMessage(jid, text);

    if (success) {
      console.log(`✅ Mensagem enviada para ${to}`);

      // Se a mensagem pede avaliação, atualizar sessão para RATING_TICKET
      if (text.includes('avalie nosso atendimento') && ticketId) {
        try {
          const session = await redisService.getSession(phone) || { state: 'idle', data: {} };
          session.state = 'rating_ticket';
          session.data.ticketId = ticketId;
          await redisService.setSession(phone, session);
          console.log(`📊 Sessão ${phone} atualizada para RATING_TICKET`);
        } catch (e) {
          console.warn('⚠️ Erro ao atualizar sessão para rating:', e.message);
        }
      }
    } else {
      console.error(`❌ Falha ao enviar mensagem para ${to}`);
    }
  }
}

export const whatsappWorker = new WhatsAppWorker();
