import { SetMetadata } from '@nestjs/common';

export const WEBHOOK_EVENT_KEY = 'webhook_event';

/**
 * Decorator para marcar métodos que devem disparar webhooks
 *
 * @example
 * @TriggerWebhook('ticket_created')
 * async create(@Body() dto: CreateTicketDto) {
 *   // ... código
 * }
 */
export const TriggerWebhook = (event: string) => SetMetadata(WEBHOOK_EVENT_KEY, event);
