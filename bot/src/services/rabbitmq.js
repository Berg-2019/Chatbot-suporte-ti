/**
 * RabbitMQ Service - Filas de mensagens
 */

import amqp from 'amqplib';
import { config } from '../config/index.js';

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assertar filas
      for (const queue of Object.values(config.queues)) {
        await this.channel.assertQueue(queue, { durable: true });
      }

      console.log('✅ RabbitMQ conectado');

      // Reconectar em caso de erro
      this.connection.on('error', async (err) => {
        console.error('❌ Erro RabbitMQ:', err.message);
        await this.reconnect();
      });

      this.connection.on('close', async () => {
        console.warn('⚠️ RabbitMQ desconectado');
        await this.reconnect();
      });

      return this.channel;
    } catch (error) {
      console.error('❌ Falha ao conectar RabbitMQ:', error.message);
      await this.reconnect();
    }
  }

  async reconnect() {
    console.log('🔄 Reconectando RabbitMQ em 5s...');
    setTimeout(() => this.connect(), 5000);
  }

  async disconnect() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (error) {
      // Ignora
    }
  }

  /**
   * Publica mensagem em uma fila
   * @param {string} queue 
   * @param {object} data 
   */
  async publish(queue, data) {
    if (!this.channel) {
      console.error('❌ Canal RabbitMQ não disponível');
      return false;
    }

    try {
      const message = Buffer.from(JSON.stringify(data));
      this.channel.sendToQueue(queue, message, { persistent: true });
      return true;
    } catch (error) {
      console.error('❌ Erro ao publicar:', error.message);
      return false;
    }
  }

  /**
   * Consome mensagens de uma fila
   * @param {string} queue 
   * @param {Function} callback 
   */
  async consume(queue, callback) {
    if (!this.channel) {
      console.error('❌ Canal RabbitMQ não disponível');
      return;
    }

    await this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          await callback(data);
          this.channel.ack(msg);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error.message);
          this.channel.nack(msg, false, false);
        }
      }
    });

    console.log(`📥 Consumindo fila: ${queue}`);
  }

  // === Helpers específicos ===

  async publishIncomingMessage(from, text, messageId) {
    return this.publish(config.queues.INCOMING_MESSAGES, {
      from,
      text,
      messageId,
      timestamp: Date.now(),
    });
  }

  async publishCreateTicket(data) {
    return this.publish(config.queues.CREATE_TICKET, data);
  }

  async publishNotification(type, ticketId, payload) {
    return this.publish(config.queues.NOTIFICATIONS, {
      type,
      ticketId,
      payload,
    });
  }
}

export const rabbitmqService = new RabbitMQService();
