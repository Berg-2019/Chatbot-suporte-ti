/**
 * GLPI Worker - Cria tickets no GLPI
 */

import axios from 'axios';
import { config } from '../config/index.js';
import { rabbitmqService } from '../services/rabbitmq.js';
import { redisService } from '../services/redis.js';

class GlpiWorker {
  constructor() {
    this.sessionToken = null;
    this.client = axios.create({
      baseURL: config.glpi.url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'App-Token': config.glpi.appToken,
      },
    });
  }

  async start() {
    console.log('🚀 GLPI Worker iniciado');

    // Consumir fila de criação de tickets
    await rabbitmqService.consume(
      config.queues.CREATE_TICKET,
      async (data) => {
        await this.processCreateTicket(data);
      }
    );
  }

  async initSession() {
    try {
      const response = await this.client.get('/initSession', {
        headers: {
          Authorization: `user_token ${config.glpi.userToken}`,
        },
      });

      this.sessionToken = response.data.session_token;
      console.log('✅ Sessão GLPI iniciada');
      return this.sessionToken;
    } catch (error) {
      console.error('❌ Erro ao iniciar sessão GLPI:', error.response?.data || error.message);
      throw error;
    }
  }

  async ensureSession() {
    if (!this.sessionToken) {
      await this.initSession();
    }
  }

  async processCreateTicket(data) {
    const { phoneNumber, title, description, sector, location, customerName } = data;

    console.log(`🎫 Criando ticket para ${phoneNumber} (${customerName || 'Anonimo'}): ${title}`);

    try {
      await this.ensureSession();

      // Criar ticket no GLPI
      const response = await this.client.post(
        '/Ticket',
        {
          input: {
            name: title,
            content: `**Descrição:** ${description}\n\n**Localização:** ${location || 'Não informado'}\n\n**Setor:** ${sector || 'Não informado'}\n\n**Telefone:** ${phoneNumber}`,
            status: 1, // Novo
            urgency: 3, // Média
            priority: 3, // Média
            type: 1, // Incidente
          },
        },
        {
          headers: {
            'Session-Token': this.sessionToken,
          },
        }
      );

      const glpiId = response.data.id;
      console.log(`✅ Ticket GLPI criado: #${glpiId}`);

      // Criar ticket no backend (PostgreSQL)
      try {
        await axios.post(`${config.backend.url}/api/bot/ticket`, {
          glpiId: glpiId,
          title: title,
          description: description,
          phoneNumber: phoneNumber,
          sector: sector || 'TI',
          category: 'Incidente',
          customerName: customerName,
        });
        console.log(`✅ Ticket salvo no backend: #${glpiId}`);
      } catch (backendError) {
        console.error('⚠️ Erro ao salvar no backend:', backendError.response?.data || backendError.message);
      }

      // Vincular ticket ao telefone
      await redisService.linkTicketToPhone(phoneNumber, glpiId.toString());

      // Notificar painel web
      await rabbitmqService.publishNotification('ticket_created', glpiId.toString(), {
        glpiId,
        phoneNumber,
        title,
        sector,
      });

    } catch (error) {
      console.error('❌ Erro ao criar ticket GLPI:', error.response?.data || error.message);

      // Se sessão expirou, tentar novamente
      if (error.response?.status === 401) {
        this.sessionToken = null;
        return this.processCreateTicket(data);
      }
    }
  }
}

export const glpiWorker = new GlpiWorker();
