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

  // === WhatsApp Session ===

  async getWhatsAppSession(): Promise<string | null> {
    return this.get('whatsapp:session');
  }

  async setWhatsAppSession(token: string, ttl: number = 3600): Promise<void> {
    await this.set('whatsapp:session', token, ttl);
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

  // === Generic Cache Methods ===

  /**
   * Get cached data with automatic JSON parsing
   */
  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Set cached data with automatic JSON stringify
   * @param key Cache key
   * @param value Data to cache
   * @param ttl Time to live in seconds (default 5 minutes)
   */
  async setCache<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(value), ttl);
  }

  /**
   * Delete cache by key
   */
  async deleteCache(key: string): Promise<void> {
    await this.del(`cache:${key}`);
  }

  /**
   * Delete cache by pattern (e.g., "tickets:*")
   */
  async deleteCacheByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /**
   * Get or set cache with factory function
   * If cache exists, return it. Otherwise, execute factory and cache result.
   */
  async getOrSetCache<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300,
  ): Promise<T> {
    const cached = await this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    await this.setCache(key, data, ttl);
    return data;
  }

  // === WhatsApp Idempotency ===

  private readonly WA_MESSAGE_TTL = 86400; // 24 hours

  /**
   * Check if a WhatsApp message was already processed (idempotency).
   * @param waMessageId The unique message ID from WhatsApp
   * @returns true if message was already processed, false otherwise
   */
  async isMessageProcessed(waMessageId: string): Promise<boolean> {
    const key = `wa:processed:${waMessageId}`;
    return this.exists(key);
  }

  /**
   * Mark a WhatsApp message as processed with 24h TTL.
   * @param waMessageId The unique message ID from WhatsApp
   * @param ttl Optional TTL in seconds (default 24 hours)
   */
  async markMessageProcessed(waMessageId: string, ttl: number = this.WA_MESSAGE_TTL): Promise<void> {
    const key = `wa:processed:${waMessageId}`;
    await this.set(key, '1', ttl);
  }

  /**
   * Atomic check-and-set: returns true if message was NOT yet processed
   * (caller should process), false if it was already processed (skip).
   * Uses Redis SETNX semantics for true atomicity.
   */
  async tryMarkMessageProcessed(waMessageId: string, ttl: number = this.WA_MESSAGE_TTL): Promise<boolean> {
    const key = `wa:processed:${waMessageId}`;
    const result = await this.client.setnx(key, '1');
    if (result === 1) {
      await this.client.expire(key, ttl);
      return true; // Message was not processed, now marked
    }
    return false; // Already processed
  }
}
