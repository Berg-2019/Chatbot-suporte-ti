/**
 * Redis Service - Cache e Sessões
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.client = new Redis(redisUrl);

    this.client.on('connect', () => {
      console.log('✅ Redis conectado');
    });

    this.client.on('error', (err) => {
      console.error('❌ Erro no Redis:', err.message);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  // === Operações básicas ===

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // === Sessões do Bot ===

  async getSession(phoneNumber: string): Promise<any | null> {
    const data = await this.get(`session:${phoneNumber}`);
    return data ? JSON.parse(data) : null;
  }

  async setSession(phoneNumber: string, data: any, ttl: number = 300): Promise<void> {
    await this.set(`session:${phoneNumber}`, JSON.stringify(data), ttl);
  }

  async deleteSession(phoneNumber: string): Promise<void> {
    await this.del(`session:${phoneNumber}`);
  }

  // === GLPI Token ===

  async getGlpiSession(): Promise<string | null> {
    return this.get('glpi:session');
  }

  async setGlpiSession(token: string, ttl: number = 3600): Promise<void> {
    await this.set('glpi:session', token, ttl);
  }

  // === User Online Status ===

  async setUserOnline(userId: string): Promise<void> {
    await this.set(`user:${userId}:online`, '1', 30);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return this.exists(`user:${userId}:online`);
  }

  // === Ticket Lock ===

  async lockTicket(ticketId: string, userId: string, ttl: number = 30): Promise<boolean> {
    const key = `ticket:${ticketId}:lock`;
    const existing = await this.get(key);
    if (existing && existing !== userId) {
      return false; // Já está bloqueado por outro usuário
    }
    await this.set(key, userId, ttl);
    return true;
  }

  async unlockTicket(ticketId: string): Promise<void> {
    await this.del(`ticket:${ticketId}:lock`);
  }
}
