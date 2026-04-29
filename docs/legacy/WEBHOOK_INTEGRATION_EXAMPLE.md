# Webhook Integration Example

Este documento mostra como integrar o WebhookService com os eventos do sistema.

## Método 1: Disparo Manual no Service

### Exemplo: TicketsService

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WebhookService } from './webhook.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService, // Injetar WebhookService
  ) {}

  async create(data: CreateTicketDto, userId: string) {
    // Criar ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        phoneNumber: data.phoneNumber,
        assignedToId: userId,
        // ...
      },
      include: {
        assignedTo: true,
        messages: true,
      },
    });

    this.logger.log(`Ticket created: ${ticket.id}`);

    // 🔔 Disparar webhook
    await this.webhookService.trigger('ticket_created', {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        phoneNumber: ticket.phoneNumber,
        assignedTo: ticket.assignedTo ? {
          id: ticket.assignedTo.id,
          name: ticket.assignedTo.name,
          email: ticket.assignedTo.email,
        } : null,
        createdAt: ticket.createdAt,
      },
    });

    return ticket;
  }

  async update(id: string, data: UpdateTicketDto) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data,
      include: {
        assignedTo: true,
      },
    });

    this.logger.log(`Ticket updated: ${id}`);

    // 🔔 Disparar webhook
    await this.webhookService.trigger('ticket_updated', {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
      },
      changes: data, // Campos que foram alterados
    });

    return ticket;
  }

  async assign(id: string, userId: string) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId: userId },
      include: {
        assignedTo: true,
      },
    });

    // 🔔 Disparar webhook
    await this.webhookService.trigger('ticket_assigned', {
      ticket: {
        id: ticket.id,
        title: ticket.title,
      },
      assignedTo: {
        id: ticket.assignedTo.id,
        name: ticket.assignedTo.name,
        email: ticket.assignedTo.email,
      },
    });

    return ticket;
  }

  async resolve(id: string) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        closedAt: new Date(),
      },
    });

    // 🔔 Disparar webhook
    await this.webhookService.trigger('ticket_resolved', {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        closedAt: ticket.closedAt,
      },
    });

    return ticket;
  }
}
```

## Método 2: Usando Interceptor (Avançado)

### Criar Webhook Interceptor

```typescript
// src/common/interceptors/webhook.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WebhookService } from '../../infrastructure/services/webhook.service';
import { WEBHOOK_EVENT_KEY } from '../decorators/trigger-webhook.decorator';

@Injectable()
export class WebhookInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly webhookService: WebhookService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const event = this.reflector.get<string>(
      WEBHOOK_EVENT_KEY,
      context.getHandler(),
    );

    if (!event) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((data) => {
        // Disparar webhook após execução bem-sucedida
        this.webhookService.trigger(event, data).catch((error) => {
          // Log error mas não falhar a requisição
          console.error(`Failed to trigger webhook for ${event}:`, error);
        });
      }),
    );
  }
}
```

### Usar o Decorator

```typescript
import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { TriggerWebhook } from '../../common/decorators/trigger-webhook.decorator';
import { WebhookInterceptor } from '../../common/interceptors/webhook.interceptor';

@Controller('tickets')
@UseInterceptors(WebhookInterceptor)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @TriggerWebhook('ticket_created') // 🔔 Dispara automaticamente
  async create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Patch(':id')
  @TriggerWebhook('ticket_updated')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }
}
```

## Método 3: Event Emitter (Recomendado para Produção)

### Instalar dependência

```bash
npm install @nestjs/event-emitter
```

### Configurar no AppModule

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ...
  ],
})
export class AppModule {}
```

### Criar Listener

```typescript
// src/infrastructure/listeners/webhook.listener.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebhookService } from '../services/webhook.service';

@Injectable()
export class WebhookListener {
  constructor(private readonly webhookService: WebhookService) {}

  @OnEvent('ticket.created')
  async handleTicketCreated(payload: any) {
    await this.webhookService.trigger('ticket_created', payload);
  }

  @OnEvent('ticket.updated')
  async handleTicketUpdated(payload: any) {
    await this.webhookService.trigger('ticket_updated', payload);
  }

  @OnEvent('ticket.assigned')
  async handleTicketAssigned(payload: any) {
    await this.webhookService.trigger('ticket_assigned', payload);
  }

  @OnEvent('ticket.resolved')
  async handleTicketResolved(payload: any) {
    await this.webhookService.trigger('ticket_resolved', payload);
  }

  @OnEvent('message.received')
  async handleMessageReceived(payload: any) {
    await this.webhookService.trigger('message_received', payload);
  }

  @OnEvent('csat.received')
  async handleCsatReceived(payload: any) {
    await this.webhookService.trigger('csat_received', payload);
  }
}
```

### Emitir eventos no Service

```typescript
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({ data });

    // Emitir evento
    this.eventEmitter.emit('ticket.created', {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        // ...
      },
    });

    return ticket;
  }
}
```

## Payload Examples

### ticket_created

```json
{
  "ticket": {
    "id": "uuid",
    "title": "Problema no computador",
    "description": "O computador não liga",
    "status": "NEW",
    "priority": "NORMAL",
    "phoneNumber": "5511999999999",
    "assignedTo": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@empresa.com"
    },
    "createdAt": "2024-02-20T10:30:00Z"
  }
}
```

### ticket_assigned

```json
{
  "ticket": {
    "id": "uuid",
    "title": "Problema no computador"
  },
  "assignedTo": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@empresa.com"
  },
  "assignedBy": {
    "id": "uuid",
    "name": "Admin"
  }
}
```

### message_received

```json
{
  "message": {
    "id": "uuid",
    "content": "Obrigado pelo atendimento!",
    "ticketId": "uuid",
    "direction": "INCOMING",
    "createdAt": "2024-02-20T10:35:00Z"
  },
  "ticket": {
    "id": "uuid",
    "title": "Problema no computador"
  }
}
```

## Verificando HMAC Signature (Receptor)

Exemplo em Node.js para validar a assinatura:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}

// Express endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  const secret = process.env.WEBHOOK_SECRET;

  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Processar webhook
  console.log('Event:', payload.event);
  console.log('Data:', payload.data);

  res.status(200).json({ received: true });
});
```

## Retry Logic (Futuro)

Para implementar retry logic em caso de falha:

```typescript
async executeWebhookWithRetry(webhook: any, event: string, payload: any, maxRetries = 3) {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.executeWebhook(webhook, event, payload);
      return; // Sucesso
    } catch (error) {
      lastError = error;
      this.logger.warn(`Webhook ${webhook.id} failed (attempt ${attempt}/${maxRetries})`);

      if (attempt < maxRetries) {
        // Esperar antes de tentar novamente (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Todas as tentativas falharam
  throw lastError;
}
```

## Recomendações

1. **Use Método 3 (Event Emitter)** para produção - desacopla webhooks da lógica de negócio
2. **Não bloqueie** requisições esperando webhooks - use fire-and-forget
3. **Implemente retry logic** para webhooks críticos
4. **Monitore falhas** via WebhookLog
5. **Limite payload** a ~10KB para evitar timeouts
6. **Use HMAC** sempre que possível para segurança
