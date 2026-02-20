import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  // Eventos permitidos (baseado no Chatwoot)
  private readonly ALLOWED_EVENTS = [
    'ticket_created',
    'ticket_updated',
    'ticket_assigned',
    'ticket_resolved',
    'ticket_closed',
    'message_received',
    'message_sent',
    'csat_received',
    'automation_executed',
    'contact_created',
    'contact_updated',
  ] as const;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos os webhooks
   */
  async findAll(filters?: { active?: boolean }) {
    const where: Prisma.WebhookWhereInput = {};

    if (filters?.active !== undefined) {
      where.active = filters.active;
    }

    return this.prisma.webhook.findMany({
      where,
      include: {
        logs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Buscar webhook por ID
   */
  async findOne(id: string) {
    return this.prisma.webhook.findUnique({
      where: { id },
      include: {
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Criar novo webhook
   */
  async create(data: {
    url: string;
    events: string[];
    active?: boolean;
    secret?: string;
    headers?: Record<string, string>;
    createdBy: string;
  }) {
    // Validar eventos
    this.validateEvents(data.events);

    // Validar URL
    this.validateUrl(data.url);

    this.logger.log(`Creating webhook: ${data.url}`);

    return this.prisma.webhook.create({
      data: {
        url: data.url,
        events: data.events,
        active: data.active ?? true,
        secret: data.secret,
        headers: data.headers || {},
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Atualizar webhook
   */
  async update(
    id: string,
    data: {
      url?: string;
      events?: string[];
      active?: boolean;
      secret?: string;
      headers?: Record<string, string>;
    },
  ) {
    if (data.events) {
      this.validateEvents(data.events);
    }

    if (data.url) {
      this.validateUrl(data.url);
    }

    this.logger.log(`Updating webhook: ${id}`);

    const updateData: Prisma.WebhookUpdateInput = {};

    if (data.url) updateData.url = data.url;
    if (data.events) updateData.events = data.events;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.secret !== undefined) updateData.secret = data.secret;
    if (data.headers !== undefined) updateData.headers = data.headers;

    return this.prisma.webhook.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Deletar webhook
   */
  async delete(id: string) {
    this.logger.log(`Deleting webhook: ${id}`);

    await this.prisma.webhook.delete({
      where: { id },
    });

    return { success: true, message: 'Webhook deleted successfully' };
  }

  /**
   * Disparar webhooks para um evento específico
   */
  async trigger(event: string, payload: Record<string, any>): Promise<void> {
    this.logger.log(`Triggering webhooks for event: ${event}`);

    // Buscar webhooks ativos que escutam este evento
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        active: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) {
      this.logger.debug(`No active webhooks found for event: ${event}`);
      return;
    }

    this.logger.log(`Found ${webhooks.length} webhooks for event: ${event}`);

    // Disparar todos os webhooks em paralelo
    const promises = webhooks.map((webhook) =>
      this.executeWebhook(webhook, event, payload),
    );

    await Promise.allSettled(promises);
  }

  /**
   * Executar um webhook individual
   */
  private async executeWebhook(
    webhook: any,
    event: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Preparar payload
      const webhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      // Gerar HMAC signature se secret estiver configurado
      const signature = webhook.secret
        ? this.generateHMAC(webhook.secret, JSON.stringify(webhookPayload))
        : undefined;

      // Preparar headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Helpdesk-Webhook/1.0',
        ...(webhook.headers || {}),
      };

      if (signature) {
        headers['X-Webhook-Signature'] = signature;
        headers['X-Webhook-Signature-Algorithm'] = 'sha256';
      }

      this.logger.debug(`Executing webhook ${webhook.id} to ${webhook.url}`);

      // Fazer requisição HTTP
      const response = await axios.post(webhook.url, webhookPayload, {
        headers,
        timeout: 10000, // 10 segundos
        validateStatus: () => true, // Aceitar qualquer status code
      });

      const duration = Date.now() - startTime;

      // Log de sucesso
      await this.logExecution(
        webhook.id,
        event,
        webhookPayload,
        response.status,
        response.data,
        null,
        duration,
      );

      this.logger.log(
        `Webhook ${webhook.id} executed successfully (${response.status}) in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = this.extractErrorMessage(error);

      // Log de erro
      await this.logExecution(
        webhook.id,
        event,
        payload,
        null,
        null,
        errorMessage,
        duration,
      );

      this.logger.error(
        `Webhook ${webhook.id} failed: ${errorMessage} (${duration}ms)`,
      );
    }
  }

  /**
   * Registrar execução do webhook
   */
  private async logExecution(
    webhookId: string,
    event: string,
    payload: any,
    statusCode: number | null,
    response: any,
    error: string | null,
    duration?: number,
  ): Promise<void> {
    try {
      await this.prisma.webhookLog.create({
        data: {
          webhookId,
          event,
          payload,
          statusCode,
          response: response ? JSON.stringify(response).substring(0, 5000) : null,
          error: error ? error.substring(0, 1000) : null,
        },
      });
    } catch (logError) {
      this.logger.error(`Failed to log webhook execution: ${logError.message}`);
    }
  }

  /**
   * Gerar HMAC SHA256 signature
   */
  private generateHMAC(secret: string, payload: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Validar eventos permitidos
   */
  private validateEvents(events: string[]): void {
    const invalidEvents = events.filter(
      (event) => !this.ALLOWED_EVENTS.includes(event as any),
    );

    if (invalidEvents.length > 0) {
      throw new Error(
        `Invalid events: ${invalidEvents.join(', ')}. Allowed events: ${this.ALLOWED_EVENTS.join(', ')}`,
      );
    }

    if (events.length === 0) {
      throw new Error('At least one event must be specified');
    }
  }

  /**
   * Validar URL do webhook
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }

      // Não permitir localhost em produção (segurança)
      if (
        process.env.NODE_ENV === 'production' &&
        (parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname === '0.0.0.0')
      ) {
        throw new Error('Localhost webhooks are not allowed in production');
      }
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error.message}`);
    }
  }

  /**
   * Extrair mensagem de erro
   */
  private extractErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      }

      if (axiosError.code === 'ECONNABORTED') {
        return 'Request timeout';
      }

      if (axiosError.code === 'ENOTFOUND') {
        return 'DNS lookup failed';
      }

      if (axiosError.code === 'ECONNREFUSED') {
        return 'Connection refused';
      }

      return axiosError.message;
    }

    return error?.message || 'Unknown error';
  }

  /**
   * Obter logs de um webhook
   */
  async getLogs(webhookId: string, limit = 50) {
    return this.prisma.webhookLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Limpar logs antigos (manutenção)
   */
  async cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await this.prisma.webhookLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned ${deleted.count} old webhook logs`);
    return deleted;
  }

  /**
   * Testar webhook manualmente
   */
  async test(webhookId: string) {
    const webhook = await this.findOne(webhookId);

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload = {
      test: true,
      message: 'This is a test webhook',
      timestamp: new Date().toISOString(),
    };

    await this.executeWebhook(webhook, 'test', testPayload);

    return { success: true, message: 'Test webhook sent' };
  }

  /**
   * Obter estatísticas de um webhook
   */
  async getStats(webhookId: string) {
    const [total, successful, failed, lastExecution] = await Promise.all([
      this.prisma.webhookLog.count({ where: { webhookId } }),
      this.prisma.webhookLog.count({
        where: {
          webhookId,
          statusCode: { gte: 200, lt: 300 },
        },
      }),
      this.prisma.webhookLog.count({
        where: {
          webhookId,
          OR: [{ statusCode: null }, { statusCode: { gte: 400 } }],
        },
      }),
      this.prisma.webhookLog.findFirst({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      lastExecution: lastExecution?.createdAt || null,
    };
  }
}
