/**
 * Redis Service - Gerenciamento de sessões do bot
 */

import Redis from 'ioredis';
import { config } from '../config/index.js';

class RedisService {
  constructor() {
    this.client = null;
  }

  async connect() {
    this.client = new Redis(config.redis.url);

    this.client.on('connect', () => {
      console.log('✅ Redis conectado');
    });

    this.client.on('error', (err) => {
      console.error('❌ Erro Redis:', err.message);
    });

    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  // === Sessões de conversa ===

  /**
   * Obtém sessão de um usuário
   * @param {string} phoneNumber 
   * @returns {Promise<object|null>}
   */
  async getSession(phoneNumber) {
    const key = `session:${phoneNumber}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Salva sessão de um usuário
   * @param {string} phoneNumber 
   * @param {object} data 
   * @param {number} ttl - TTL em segundos
   */
  async setSession(phoneNumber, data, ttl = config.timeouts.sessionTTL) {
    const key = `session:${phoneNumber}`;
    await this.client.setex(key, ttl, JSON.stringify(data));
  }

  /**
   * Deleta sessão
   * @param {string} phoneNumber 
   */
  async deleteSession(phoneNumber) {
    const key = `session:${phoneNumber}`;
    await this.client.del(key);
  }

  // === Status do bot ===

  /**
   * Atualiza status do bot no Redis (lido pelo backend)
   * @param {object} status 
   */
  async updateBotStatus(status) {
    await this.client.set('bot:status', JSON.stringify({
      ...status,
      updatedAt: new Date().toISOString(),
    }));
  }

  // === Ticket tracking ===

  /**
   * Vincula ticket a um telefone
   * @param {string} phoneNumber 
   * @param {string} ticketId 
   */
  async linkTicketToPhone(phoneNumber, ticketId) {
    const key = `phone:${phoneNumber}:ticket`;
    await this.client.set(key, ticketId);
  }

  /**
   * Obtém ticket vinculado a um telefone
   * @param {string} phoneNumber 
   * @returns {Promise<string|null>}
   */
  async getTicketByPhone(phoneNumber) {
    const key = `phone:${phoneNumber}:ticket`;
    return this.client.get(key);
  }
}

export const redisService = new RedisService();
