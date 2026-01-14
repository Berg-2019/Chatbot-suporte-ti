/**
 * RabbitMQ Service - Filas de Mensagens
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export interface QueueMessage {
  queue: string;
  data: any;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: any;
  private channel: any;
  private isConnected = false;

  // Filas do sistema
  static readonly QUEUES = {
    INCOMING_MESSAGES: 'incoming_messages',
    OUTGOING_MESSAGES: 'outgoing_messages',
    CREATE_TICKET: 'create_ticket',
    UPDATE_TICKET: 'update_ticket',
    NOTIFICATIONS: 'notifications',
  };

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      const url = this.config.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Assertar todas as filas
      for (const queue of Object.values(RabbitMQService.QUEUES)) {
        await this.channel.assertQueue(queue, { durable: true });
      }

      this.isConnected = true;
      console.log('✅ RabbitMQ conectado');

      // Reconectar em caso de erro
      this.connection.on('error', async (err: any) => {
        console.error('❌ Erro no RabbitMQ:', err.message);
        this.isConnected = false;
        await this.reconnect();
      });

      this.connection.on('close', async () => {
        console.warn('⚠️ Conexão RabbitMQ fechada');
        this.isConnected = false;
        await this.reconnect();
      });
    } catch (error: any) {
      console.error('❌ Falha ao conectar RabbitMQ:', error.message);
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    console.log('🔄 Tentando reconectar ao RabbitMQ em 5s...');
    setTimeout(() => this.connect(), 5000);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.isConnected = false;
    } catch (error) {
      // Ignora erros de desconexão
    }
  }

  /**
   * Publica mensagem em uma fila
   */
  async publish(queue: string, data: any): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      console.error('❌ RabbitMQ não conectado');
      return false;
    }

    try {
      const message = Buffer.from(JSON.stringify(data));
      this.channel.sendToQueue(queue, message, { persistent: true });
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao publicar mensagem:', error.message);
      return false;
    }
  }

  /**
   * Consome mensagens de uma fila
   */
  async consume(
    queue: string,
    callback: (data: any) => Promise<void>,
  ): Promise<void> {
    if (!this.isConnected || !this.channel) {
      console.error('❌ RabbitMQ não conectado');
      return;
    }

    await this.channel.consume(queue, async (msg: any) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          await callback(data);
          this.channel.ack(msg);
        } catch (error: any) {
          console.error('❌ Erro ao processar mensagem:', error.message);
          // Rejeitar e não requeue para evitar loop infinito
          this.channel.nack(msg, false, false);
        }
      }
    });

    console.log(`📥 Consumindo fila: ${queue}`);
  }

  /**
   * Helpers para filas específicas
   */

  async publishIncomingMessage(data: {
    from: string;
    text: string;
    timestamp: number;
  }): Promise<boolean> {
    return this.publish(RabbitMQService.QUEUES.INCOMING_MESSAGES, data);
  }

  async publishOutgoingMessage(data: {
    to: string;
    text: string;
    ticketId?: string;
  }): Promise<boolean> {
    return this.publish(RabbitMQService.QUEUES.OUTGOING_MESSAGES, data);
  }

  async publishCreateTicket(data: {
    phoneNumber: string;
    title: string;
    description: string;
    category?: string;
    sector?: string;
  }): Promise<boolean> {
    return this.publish(RabbitMQService.QUEUES.CREATE_TICKET, data);
  }

  async publishNotification(data: {
    type: 'ticket_created' | 'ticket_assigned' | 'new_message';
    ticketId: string;
    userId?: string;
    payload: any;
  }): Promise<boolean> {
    return this.publish(RabbitMQService.QUEUES.NOTIFICATIONS, data);
  }
}
