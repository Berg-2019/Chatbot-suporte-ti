/Task helpdesk implementar esse plano em uma nova branch no chatbot-suporte-ti

# 🔄 Plano de Absorção de Funcionalidades
## Helpdesk WhatsApp + GLPI — V3 Feature Roadmap

> **Objetivo:** Mapear e absorver as melhores funcionalidades de **Chatwoot**, **Peppermint**, **Typebot** e **Rasa** no sistema Helpdesk existente.
> **Estratégia:** Cherry-pick de features, NÃO integração de sistemas externos.
> **Data:** 2026-02-19

---

## Índice

1. [Mapeamento Geral de Funcionalidades](#1-mapeamento-geral)
2. [Absorção do Chatwoot](#2-chatwoot)
3. [Absorção do Peppermint](#3-peppermint)
4. [Absorção do Typebot](#4-typebot)
5. [Absorção do Rasa](#5-rasa)
6. [Plano de Implementação Priorizado](#6-plano-priorizado)
7. [Estimativas e Dependências](#7-estimativas)

---

## 1. Mapeamento Geral

### Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Já existe no seu sistema |
| 🔨 | Planejado no V2 (IMPLEMENTATION_PLAN_V2.md) |
| 🆕 | Funcionalidade nova a absorver |
| ⭐ | Alta prioridade / alto impacto |
| 🔵 | Média prioridade |
| ⚪ | Baixa prioridade / nice-to-have |

### Matriz Completa

| Funcionalidade | Seu Sistema | Chatwoot | Peppermint | Typebot | Rasa | Absorver? |
|---|---|---|---|---|---|---|
| **TICKETS & ATENDIMENTO** | | | | | | |
| Criação de tickets via WhatsApp | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Criação de tickets via Email | ❌ | ✅ | ✅ | ❌ | ❌ | ⭐ 🆕 |
| Criação de tickets via Portal Web | ❌ | ✅ | ✅ | ❌ | ❌ | 🔵 🆕 |
| CSAT (Pesquisa de Satisfação) | ❌ | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| SLA com alertas automáticos | ✅ parcial | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| Prioridades (Urgent/High/Medium/Low) | ✅ | ✅ | ✅ | ❌ | ❌ | — |
| Labels/Tags em conversas | ❌ | ✅ | ❌ | ❌ | ❌ | 🔵 🆕 |
| Notas internas (@mentions) | ❌ | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| Histórico completo do contato | ❌ | ✅ | ✅ | ❌ | ❌ | ⭐ 🆕 |
| Snooze/Adiar conversa | ❌ | ✅ | ❌ | ❌ | ❌ | ⚪ 🆕 |
| Macros (ações em lote) | ❌ | ✅ | ❌ | ❌ | ❌ | 🔵 🆕 |
| **AUTOMAÇÃO** | | | | | | |
| Regras de automação (event→action) | ❌ | ✅ | ❌ | ✅ | ✅ | ⭐ 🆕 |
| Auto-atribuição de agente | ❌ | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| Respostas prontas (Canned Responses) | ❌ | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| Horário de funcionamento | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Gatilhos condicionais no bot | ✅ parcial | ❌ | ❌ | ✅ | ✅ | 🔵 🆕 |
| **BOT & CONVERSAÇÃO** | | | | | | |
| Fluxos visuais (drag & drop) | ❌ | ❌ | ❌ | ✅ | ❌ | ⚪ 🆕 |
| Lógica condicional avançada | ✅ parcial | ❌ | ❌ | ✅ | ✅ | 🔵 🆕 |
| A/B testing de mensagens | ❌ | ❌ | ❌ | ✅ | ❌ | ⚪ 🆕 |
| Variáveis dinâmicas no bot | ✅ parcial | ❌ | ❌ | ✅ | ✅ | 🔵 🆕 |
| NLU (compreensão linguagem natural) | ❌ | ❌ | ❌ | ❌ | ✅ | 🔵 🆕 |
| Intent detection | ❌ | ❌ | ❌ | ❌ | ✅ | 🔵 🆕 |
| Entity extraction | ❌ | ❌ | ❌ | ❌ | ✅ | ⚪ 🆕 |
| Fallback inteligente | ✅ parcial | ❌ | ❌ | ✅ | ✅ | 🔵 🆕 |
| **SEGURANÇA & ACESSO** | | | | | | |
| RBAC (Role-Based Access Control) | 🔨 Sprint 1 | ✅ | ✅ | ❌ | ❌ | ⭐ ref. |
| SSO/OIDC | ❌ | ✅ | ✅ | ❌ | ❌ | 🔵 🆕 |
| Audit logs | 🔨 Sprint 2 | ✅ | ✅ | ❌ | ❌ | ⭐ ref. |
| Rate limiting | 🔨 Sprint 2 | ✅ | ❌ | ❌ | ❌ | ⭐ ref. |
| Bloqueio de contatos | ❌ | ✅ | ❌ | ❌ | ❌ | 🔵 🆕 |
| **RELATÓRIOS & ANALYTICS** | | | | | | |
| Dashboard com métricas em tempo real | ✅ | ✅ | ✅ | ❌ | ❌ | — |
| Relatório por agente | ✅ parcial | ✅ | ✅ | ❌ | ❌ | ⭐ 🆕 |
| Relatório CSAT | ❌ | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| Relatório por label/categoria | ❌ | ✅ | ❌ | ❌ | ❌ | 🔵 🆕 |
| Exportação CSV/Excel | ✅ | ✅ | ✅ | ❌ | ❌ | — |
| Tempo médio de resposta | ❌ | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| Tempo médio de resolução | ❌ | ✅ | ❌ | ❌ | ❌ | ⭐ 🆕 |
| Live view (conversas em andamento) | ❌ | ✅ | ❌ | ❌ | ❌ | 🔵 🆕 |
| **NOTIFICAÇÕES** | | | | | | |
| WebSocket (tempo real) | ✅ parcial | ✅ | ❌ | ❌ | ❌ | 🔨 Sprint 7 |
| Push notifications (desktop) | 🔨 Sprint 7 | ✅ | ❌ | ❌ | ❌ | 🔨 ref. |
| Notificação por email | 🔨 Sprint 7 | ✅ | ✅ | ❌ | ❌ | 🔨 ref. |
| Notificação WhatsApp (técnicos) | 🔨 Sprint 7 | ❌ | ❌ | ❌ | ❌ | 🔨 ref. |
| Som de notificação customizável | ❌ | ✅ | ❌ | ❌ | ❌ | 🔵 🆕 |
| **CHAT & MÍDIA** | | | | | | |
| Chat texto | ✅ | ✅ | ❌ | ✅ | ✅ | — |
| Imagens | 🔨 Sprint 6 | ✅ | ✅ | ✅ | ❌ | 🔨 ref. |
| Áudio | 🔨 Sprint 6 | ✅ | ❌ | ❌ | ❌ | 🔨 ref. |
| Vídeo | 🔨 Sprint 6 | ✅ | ❌ | ✅ | ❌ | 🔨 ref. |
| Documentos (PDF, DOCX) | 🔨 Sprint 6 | ✅ | ✅ | ❌ | ❌ | 🔨 ref. |
| Emoji reactions | ❌ | ✅ | ❌ | ❌ | ❌ | ⚪ 🆕 |
| **KNOWLEDGE BASE** | | | | | | |
| FAQ (base de conhecimento) | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Help Center (portal público) | ❌ | ✅ | ❌ | ❌ | ❌ | 🔵 🆕 |
| Notebooks/Wiki interno | ❌ | ❌ | ✅ | ❌ | ❌ | 🔵 🆕 |
| Artigos com markdown | ❌ | ✅ | ✅ | ❌ | ❌ | 🔵 🆕 |
| **WEBHOOKS & INTEGRAÇÕES** | | | | | | |
| Webhooks de saída | ❌ | ✅ | ✅ | ✅ | ❌ | ⭐ 🆕 |
| API REST documentada | 🔨 Sprint 5 | ✅ | ✅ | ✅ | ✅ | 🔨 ref. |
| Integração GLPI | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Integração Google Translate | ❌ | ✅ | ❌ | ❌ | ❌ | ⚪ 🆕 |
| Dashboard Apps (embed tools) | ❌ | ✅ | ❌ | ❌ | ❌ | ⚪ 🆕 |

---

## 2. Absorção do Chatwoot

O Chatwoot é a maior fonte de funcionalidades a absorver. É o sistema mais maduro e completo entre os quatro.

### 2.1 ⭐ CSAT — Pesquisa de Satisfação

**O que o Chatwoot faz:** Ao resolver um ticket, envia automaticamente uma pesquisa de satisfação com escala emoji (😡😕😐🙂😍) + campo de texto opcional. Gera relatórios com scores médios por agente, por período, e por inbox.

**Como absorver no seu sistema:**

#### Backend — Schema Prisma

```prisma
model CsatResponse {
  id           String   @id @default(uuid())
  ticketId     String   @unique
  ticket       Ticket   @relation(fields: [ticketId], references: [id])
  
  rating       Int      // 1-5 (😡 a 😍)
  feedback     String?  // Texto opcional
  
  assignedToId String?  // Técnico que atendeu
  assignedTo   User?    @relation(fields: [assignedToId], references: [id])
  
  respondedAt  DateTime @default(now())
  sentAt       DateTime // Quando foi enviada
  channel      String   // 'whatsapp', 'web', 'email'
  
  // Review notes (do Chatwoot) — notas internas sobre o feedback
  reviewNote   String?
  reviewedBy   String?
  
  @@index([assignedToId])
  @@index([respondedAt])
  @@index([rating])
}
```

#### Bot — Enviar pesquisa ao fechar ticket

```javascript
// flow-handler.js — Ao resolver ticket
async handleTicketResolved(sock, from, ticketId) {
  const phone = from.split('@')[0];
  
  // Registrar envio
  await axios.post(`${BACKEND_URL}/api/csat/send`, { ticketId });
  
  // Enviar mensagem WhatsApp
  const message = `✅ Seu chamado foi resolvido!\n\n` +
    `Como você avalia o atendimento?\n\n` +
    `1 - 😡 Péssimo\n` +
    `2 - 😕 Ruim\n` +
    `3 - 😐 Regular\n` +
    `4 - 🙂 Bom\n` +
    `5 - 😍 Excelente\n\n` +
    `Digite o número da sua avaliação:`;
  
  await this.sendMessage(sock, from, message);
  
  // Mudar estado da sessão
  const session = await redisService.getSession(phone);
  session.state = STATES.CSAT_RATING;
  session.data.csatTicketId = ticketId;
  await redisService.setSession(phone, session);
}

async handleCsatRating(sock, from, text, session) {
  const rating = parseInt(text);
  
  if (rating < 1 || rating > 5 || isNaN(rating)) {
    await this.sendMessage(sock, from, 'Por favor, digite um número de 1 a 5:');
    return;
  }
  
  session.data.csatRating = rating;
  
  if (rating <= 3) {
    // Pedir feedback se nota baixa
    session.state = STATES.CSAT_FEEDBACK;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, 
      'Obrigado pela avaliação. Poderia nos dizer o que podemos melhorar? (ou digite "pular")');
  } else {
    // Salvar e agradecer
    await this.saveCsatResponse(session.data.csatTicketId, rating, null);
    await this.sendMessage(sock, from, '😊 Obrigado pela avaliação! Estamos à disposição.');
    await this.resetToMenu(sock, from);
  }
}

async handleCsatFeedback(sock, from, text, session) {
  const feedback = text.toLowerCase() === 'pular' ? null : text;
  await this.saveCsatResponse(session.data.csatTicketId, session.data.csatRating, feedback);
  await this.sendMessage(sock, from, 'Obrigado pelo feedback! Vamos melhorar. 💪');
  await this.resetToMenu(sock, from);
}
```

#### Backend — Endpoint de relatório CSAT

```typescript
// csat.controller.ts
@Get('report')
@Roles(UserRole.ADMIN, UserRole.AGENT)
async getCsatReport(@Query() query: CsatReportQueryDto) {
  return this.csatService.getReport(query);
}

// csat.service.ts
async getReport(query: CsatReportQueryDto) {
  const where: any = {};
  if (query.startDate) where.respondedAt = { gte: new Date(query.startDate) };
  if (query.endDate) where.respondedAt = { ...where.respondedAt, lte: new Date(query.endDate) };
  if (query.assignedToId) where.assignedToId = query.assignedToId;
  
  const [responses, avgRating, ratingDistribution] = await Promise.all([
    this.prisma.csatResponse.findMany({ where, include: { assignedTo: true, ticket: true } }),
    this.prisma.csatResponse.aggregate({ where, _avg: { rating: true } }),
    this.prisma.csatResponse.groupBy({ by: ['rating'], where, _count: true }),
  ]);
  
  // Calcular por agente
  const byAgent = await this.prisma.csatResponse.groupBy({
    by: ['assignedToId'],
    where,
    _avg: { rating: true },
    _count: true,
  });
  
  return {
    totalResponses: responses.length,
    averageRating: avgRating._avg.rating,
    distribution: ratingDistribution,
    byAgent,
    responseRate: await this.calculateResponseRate(where),
  };
}
```

**Checklist:**
- [ ] Criar model CsatResponse no Prisma
- [ ] Criar migration
- [ ] Implementar estados CSAT_RATING e CSAT_FEEDBACK no bot
- [ ] Criar CsatService e CsatController no backend
- [ ] Criar endpoint de relatório com filtros
- [ ] Criar componente de relatório CSAT no frontend
- [ ] Enviar CSAT automaticamente ao resolver ticket

---

### 2.2 ⭐ Regras de Automação (Engine de Automação)

**O que o Chatwoot faz:** Sistema de regras evento→condição→ação. Ex: "Quando criar conversa + status = open + idioma = pt → atribuir ao Time Brasil + adicionar label 'português'".

**Como absorver:**

#### Schema Prisma

```prisma
model AutomationRule {
  id          String   @id @default(uuid())
  name        String
  description String?
  active      Boolean  @default(true)
  
  // Evento gatilho
  event       String   // 'ticket_created', 'message_received', 'ticket_updated', 
                       // 'ticket_assigned', 'csat_received'
  
  // Condições (JSON) — Array de condições com operador AND/OR
  conditions  Json     // [{ field: "priority", operator: "equals", value: "CRITICAL" }]
  conditionOperator String @default("AND") // AND | OR
  
  // Ações (JSON) — Array de ações a executar
  actions     Json     // [{ type: "assign_agent", value: "user-id" }, 
                       //  { type: "add_label", value: "urgente" }]
  
  // Auditoria
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  executionCount Int   @default(0)
  lastExecutedAt DateTime?
  
  @@index([event, active])
}

// Tipos de Ação suportados:
// - assign_agent: Atribuir a um agente específico
// - assign_team: Atribuir a um time/nível (N1, N2, N3)
// - add_label: Adicionar label ao ticket
// - set_priority: Alterar prioridade
// - send_message: Enviar mensagem automática (WhatsApp)
// - send_notification: Notificar técnicos
// - send_webhook: Disparar webhook externo
// - escalate: Escalonar para nível superior
// - snooze: Adiar conversa por X minutos
```

#### Backend — Automation Engine

```typescript
// automation-engine.service.ts
@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);
  
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private whatsappService: WhatsAppService,
    private webhookService: WebhookService,
  ) {}

  /**
   * Processar evento e executar regras que correspondem
   */
  async processEvent(event: string, context: Record<string, any>): Promise<void> {
    // Buscar regras ativas para este evento
    const rules = await this.prisma.automationRule.findMany({
      where: { event, active: true },
    });

    for (const rule of rules) {
      try {
        // Avaliar condições
        if (this.evaluateConditions(rule.conditions, rule.conditionOperator, context)) {
          this.logger.log(`Executando regra: ${rule.name}`);
          
          // Executar ações
          await this.executeActions(rule.actions, context);
          
          // Atualizar contagem
          await this.prisma.automationRule.update({
            where: { id: rule.id },
            data: { 
              executionCount: { increment: 1 },
              lastExecutedAt: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error(`Erro na regra ${rule.name}: ${error.message}`);
      }
    }
  }

  private evaluateConditions(
    conditions: any[], 
    operator: string, 
    context: Record<string, any>
  ): boolean {
    const results = conditions.map(condition => {
      const fieldValue = this.getNestedValue(context, condition.field);
      
      switch (condition.operator) {
        case 'equals': return fieldValue === condition.value;
        case 'not_equals': return fieldValue !== condition.value;
        case 'contains': return String(fieldValue).includes(condition.value);
        case 'starts_with': return String(fieldValue).startsWith(condition.value);
        case 'greater_than': return Number(fieldValue) > Number(condition.value);
        case 'less_than': return Number(fieldValue) < Number(condition.value);
        case 'in': return condition.value.includes(fieldValue);
        case 'not_in': return !condition.value.includes(fieldValue);
        case 'is_empty': return !fieldValue;
        case 'is_not_empty': return !!fieldValue;
        default: return false;
      }
    });

    return operator === 'AND' 
      ? results.every(r => r) 
      : results.some(r => r);
  }

  private async executeActions(actions: any[], context: Record<string, any>): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'assign_agent':
          await this.prisma.ticket.update({
            where: { id: context.ticketId },
            data: { assignedTo: action.value },
          });
          break;

        case 'set_priority':
          await this.prisma.ticket.update({
            where: { id: context.ticketId },
            data: { priority: action.value },
          });
          break;

        case 'add_label':
          await this.prisma.ticketLabel.create({
            data: { ticketId: context.ticketId, label: action.value },
          });
          break;

        case 'send_message':
          if (context.phoneNumber) {
            await this.whatsappService.sendMessage(
              context.phoneNumber, 
              this.interpolateTemplate(action.value, context)
            );
          }
          break;

        case 'send_notification':
          await this.notificationService.send({
            event: 'AUTOMATION_TRIGGERED',
            priority: action.priority || 'NORMAL',
            title: action.title || 'Automação executada',
            message: this.interpolateTemplate(action.value, context),
            targetUsers: action.targetUsers,
          });
          break;

        case 'send_webhook':
          await this.webhookService.trigger(action.url, action.method || 'POST', context);
          break;

        case 'escalate':
          // Lógica de escalonamento N1 → N2 → N3
          await this.escalateTicket(context.ticketId);
          break;
      }
    }
  }

  private interpolateTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
      return this.getNestedValue(context, key) || '';
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
```

#### Integrar nos Services existentes

```typescript
// tickets.service.ts — Disparar evento ao criar ticket
async create(dto: CreateTicketDto): Promise<Ticket> {
  const ticket = await this.prisma.ticket.create({ data: dto });

  // ✅ Disparar engine de automação
  await this.automationEngine.processEvent('ticket_created', {
    ticketId: ticket.id,
    priority: ticket.priority,
    sector: ticket.sector,
    category: ticket.category,
    customerName: ticket.customerName,
    phoneNumber: ticket.phoneNumber,
    description: ticket.description,
  });

  return ticket;
}
```

**Checklist:**
- [ ] Criar model AutomationRule no Prisma
- [ ] Criar AutomationEngineService com evaluateConditions e executeActions
- [ ] Criar AutomationController (CRUD de regras — apenas ADMIN)
- [ ] Integrar processEvent em TicketsService (create, update)
- [ ] Integrar processEvent em MessagesService (nova mensagem)
- [ ] Criar frontend para gerenciar regras (admin panel)
- [ ] Criar regras padrão (ex: ticket CRITICAL → notifica todos)

---

### 2.3 ⭐ Respostas Prontas (Canned Responses)

**O que o Chatwoot faz:** Banco de respostas pré-configuradas que agentes acessam digitando `/` no chat. Ex: `/saudacao` expande para "Olá! Sou o técnico X, como posso ajudar?"

**Como absorver:**

```prisma
model CannedResponse {
  id        String  @id @default(uuid())
  shortcode String  @unique  // Ex: "saudacao", "reiniciar_pc"
  content   String           // Texto da resposta (suporta {{variáveis}})
  category  String?          // "Geral", "TI", "Elétrica"
  
  createdBy String
  createdAt DateTime @default(now())
  
  @@index([shortcode])
  @@index([category])
}
```

No frontend, ao digitar `/` no input do chat, mostrar um dropdown com as respostas filtradas. Ao selecionar, substituir o shortcode pelo conteúdo com variáveis interpoladas ({{nome_cliente}}, {{numero_ticket}}, etc).

**Checklist:**
- [ ] Criar model CannedResponse
- [ ] Criar CRUD no backend
- [ ] Criar componente dropdown no ChatView (trigger com `/`)
- [ ] Suportar variáveis dinâmicas no conteúdo
- [ ] Popular com respostas padrão no seed

---

### 2.4 ⭐ Notas Internas e @Mentions

**O que o Chatwoot faz:** Técnicos podem deixar notas internas (invisíveis ao cliente) nas conversas e mencionar colegas com @nome para chamar atenção.

**Como absorver:**

```prisma
model Message {
  // ... campos existentes ...
  
  isInternal  Boolean  @default(false)  // ✅ NOVO: Nota interna
  mentions    String[] // ✅ NOVO: IDs dos usuários mencionados
}
```

No frontend, adicionar toggle "Nota Interna" no input do chat. Notas aparecem com visual diferente (fundo amarelo, ícone de cadeado). Ao mencionar com @, notificar o técnico mencionado.

**Checklist:**
- [ ] Adicionar campo isInternal e mentions no Message
- [ ] Filtrar mensagens internas no envio ao WhatsApp (nunca enviar)
- [ ] Criar visual diferenciado no ChatView
- [ ] Implementar @mention com autocomplete de agentes
- [ ] Notificar agentes mencionados

---

### 2.5 ⭐ Métricas de Performance por Agente

**O que o Chatwoot faz:** Relatórios detalhados por agente com tempo médio de primeira resposta, tempo médio de resolução, total de conversas, CSAT médio.

**Como absorver:**

```typescript
// agent-metrics.service.ts
async getAgentMetrics(agentId: string, period: { start: Date; end: Date }) {
  const tickets = await this.prisma.ticket.findMany({
    where: {
      assignedTo: agentId,
      createdAt: { gte: period.start, lte: period.end },
    },
    include: { messages: true, csatResponse: true },
  });

  return {
    totalTickets: tickets.length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
    averageFirstResponseTime: this.calcAvgFirstResponse(tickets),
    averageResolutionTime: this.calcAvgResolution(tickets),
    csatAverage: this.calcCsatAverage(tickets),
    ticketsByPriority: this.groupByPriority(tickets),
    ticketsByCategory: this.groupByCategory(tickets),
  };
}
```

**Checklist:**
- [ ] Criar AgentMetricsService
- [ ] Calcular First Response Time (1ª mensagem OUTGOING após INCOMING)
- [ ] Calcular Resolution Time (criação → resolução)
- [ ] Dashboard de métricas por agente no frontend
- [ ] Ranking de agentes (gamificação opcional)

---

### 2.6 ⭐ Histórico Completo do Contato

**O que o Chatwoot faz:** Perfil unificado do cliente com todos os tickets anteriores, dados custom, timeline de interações.

**Como absorver:**

```prisma
model Contact {
  id          String   @id @default(uuid())
  name        String
  phone       String   @unique
  email       String?
  sector      String?
  company     String?
  jid         String?  @unique  // WhatsApp JID
  
  // Custom attributes (inspirado no Chatwoot)
  customAttributes Json?  // { "cargo": "Gerente", "ramal": "2045" }
  
  // Relações
  tickets     Ticket[]
  
  firstContactAt DateTime @default(now())
  lastContactAt  DateTime @default(now())
  totalTickets   Int      @default(0)
  
  @@index([phone])
  @@index([jid])
}
```

No frontend, sidebar do chat mostra: dados do contato, número de tickets anteriores, CSAT médio, último atendimento, custom attributes editáveis.

**Checklist:**
- [ ] Criar/atualizar model Contact
- [ ] Migrar dados existentes de tickets para Contact
- [ ] Criar endpoint GET /contacts/:phone/history
- [ ] Criar sidebar de perfil no ChatView
- [ ] Auto-criar Contact quando novo usuário interage

---

### 2.7 Email-to-Ticket

**O que o Chatwoot faz:** Configura mailbox SMTP/IMAP, converte emails recebidos em tickets automaticamente.

**Como absorver:**

```typescript
// email-ingestion.service.ts
import Imap from 'imap';
import { simpleParser } from 'mailparser';

@Injectable()
export class EmailIngestionService {
  private imap: Imap;

  constructor(
    private ticketsService: TicketsService,
    private automationEngine: AutomationEngineService,
  ) {
    this.imap = new Imap({
      user: process.env.SUPPORT_EMAIL_USER,
      password: process.env.SUPPORT_EMAIL_PASS,
      host: process.env.SUPPORT_EMAIL_HOST,
      port: 993,
      tls: true,
    });
  }

  async startListening() {
    this.imap.on('mail', () => this.processNewEmails());
    this.imap.connect();
  }

  private async processNewEmails() {
    // Buscar emails não lidos
    // Para cada email: criar ticket com título = subject, descrição = body
    // Associar ao contato pelo email do remetente
    // Disparar automation engine
  }
}
```

**Checklist:**
- [ ] Instalar `imap` e `mailparser`
- [ ] Criar EmailIngestionService
- [ ] Configurar polling (a cada 1-2 min) ou IMAP IDLE
- [ ] Criar ticket automaticamente a partir do email
- [ ] Responder ao email quando técnico responde no painel
- [ ] Configurar no admin panel (credenciais SMTP/IMAP)

---

### 2.8 ⭐ Sistema de Webhooks de Saída

**O que Chatwoot/Peppermint fazem:** Quando eventos acontecem, disparam HTTP POST para URLs configuradas.

**Como absorver:**

```prisma
model Webhook {
  id        String   @id @default(uuid())
  url       String
  events    String[] // ['ticket_created', 'ticket_resolved', 'message_received']
  active    Boolean  @default(true)
  secret    String?  // Para validar HMAC
  
  headers   Json?    // Headers customizados
  
  createdBy String
  createdAt DateTime @default(now())
  
  // Logs
  logs      WebhookLog[]
}

model WebhookLog {
  id         String   @id @default(uuid())
  webhookId  String
  webhook    Webhook  @relation(fields: [webhookId], references: [id])
  
  event      String
  payload    Json
  statusCode Int?
  response   String?
  error      String?
  
  createdAt  DateTime @default(now())
  
  @@index([webhookId, createdAt])
}
```

```typescript
// webhook.service.ts
@Injectable()
export class WebhookService {
  async trigger(event: string, payload: any): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: { active: true, events: { has: event } },
    });

    for (const webhook of webhooks) {
      try {
        const signature = webhook.secret 
          ? this.generateHMAC(webhook.secret, JSON.stringify(payload))
          : undefined;

        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...(signature && { 'X-Webhook-Signature': signature }),
            ...webhook.headers,
          },
          timeout: 10000,
        });

        await this.logExecution(webhook.id, event, payload, response.status);
      } catch (error) {
        await this.logExecution(webhook.id, event, payload, null, error.message);
      }
    }
  }
}
```

**Checklist:**
- [ ] Criar models Webhook e WebhookLog
- [ ] Criar WebhookService
- [ ] Criar WebhookController (CRUD — apenas ADMIN)
- [ ] Integrar trigger nos eventos (ticket create/update/resolve, message)
- [ ] HMAC signature para segurança
- [ ] Frontend de configuração de webhooks
- [ ] Página de logs de execução

---

## 3. Absorção do Peppermint

### 3.1 RBAC Maduro (Referência para Sprint 1)

O Peppermint já tem RBAC com roles customizáveis. Usar como referência para melhorar o que está no Sprint 1 do V2.

**Melhoria sobre o plano V2:** Ao invés de roles fixas (ADMIN, AGENT, STOCK_MANAGER, VIEWER), criar roles customizáveis:

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  
  // Permissões granulares
  permissions Json     // ["tickets:read", "tickets:write", "stock:read", "stock:write:delete", ...]
  
  isSystem    Boolean  @default(false) // Roles do sistema não podem ser deletadas
  users       User[]
  
  createdAt   DateTime @default(now())
}

// Permissões possíveis:
// tickets:read, tickets:write, tickets:assign, tickets:delete
// stock:read, stock:write, stock:delete, stock:movement
// reservations:read, reservations:write, reservations:approve
// users:read, users:write, users:delete
// reports:read, reports:export
// admin:settings, admin:automation, admin:webhooks
// bot:config
```

**Checklist:**
- [ ] Criar model Role com permissões JSON
- [ ] Seed com roles padrão (Admin, Técnico N1, N2, N3, Estoquista, Visualizador)
- [ ] Atualizar RolesGuard para verificar permissões granulares
- [ ] Criar UI de gerenciamento de roles no admin

---

### 3.2 Notebooks/Wiki Interno

**O que o Peppermint faz:** Notebooks com markdown e todo lists para documentação interna da equipe.

**Como absorver:**

```prisma
model KnowledgeArticle {
  id          String   @id @default(uuid())
  title       String
  content     String   // Markdown
  category    String   // "Procedimentos", "Troubleshooting", "Onboarding"
  
  isPublic    Boolean  @default(false) // Se true, visível no Help Center
  isInternal  Boolean  @default(true)  // Visível apenas para agentes
  
  tags        String[]
  
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  
  views       Int      @default(0)
  helpful     Int      @default(0)    // Contagem de "útil"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category])
  @@index([isPublic])
  @@index([tags])
}
```

**Checklist:**
- [ ] Criar model KnowledgeArticle
- [ ] Criar CRUD com editor markdown (ex: react-markdown ou @uiw/react-md-editor)
- [ ] Busca full-text nos artigos
- [ ] Sugestão de artigos ao técnico baseado em keywords do ticket
- [ ] Help Center público (opcional, artigos com isPublic=true)

---

### 3.3 Server Logs no Admin Panel

**O que o Peppermint faz:** Painel no admin mostrando logs do servidor para facilitar debug.

**Como absorver:** Criar endpoint que lê os últimos N logs do backend e exibe no painel admin. Útil para debug sem precisar acessar SSH.

**Checklist:**
- [ ] Criar endpoint GET /admin/logs (últimas 500 linhas)
- [ ] Criar componente LogViewer com auto-refresh
- [ ] Filtrar por nível (ERROR, WARN, INFO, DEBUG)

---

## 4. Absorção do Typebot

### 4.1 Lógica Condicional Avançada no Bot

**O que o Typebot faz:** Variáveis, condições complexas, branching dinâmico com interface visual.

**Como absorver no código:** Ao invés de recriar o builder visual (muito complexo), absorver o conceito de variáveis e condições no flow-handler:

```javascript
// Criar sistema de variáveis dinâmicas para o bot
class BotVariableEngine {
  constructor(session) {
    this.session = session;
    this.variables = {
      // Variáveis do sistema
      contact_name: session.data.contactName,
      contact_phone: session.data.phone,
      contact_sector: session.data.sector,
      current_time: new Date().toLocaleTimeString('pt-BR'),
      current_date: new Date().toLocaleDateString('pt-BR'),
      is_business_hours: this.isBusinessHours(),
      
      // Variáveis do ticket
      ticket_id: session.data.ticketId,
      ticket_priority: session.data.priority,
      
      // Variáveis customizadas
      ...session.data.customVars,
    };
  }

  interpolate(template) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return this.variables[key] || '';
    });
  }

  evaluate(condition) {
    // { field: "contact_sector", operator: "equals", value: "TI" }
    const fieldValue = this.variables[condition.field];
    // ... mesma lógica do automation engine
  }

  isBusinessHours() {
    const hour = new Date().getHours();
    return hour >= 8 && hour < 18;
  }
}
```

**Checklist:**
- [ ] Criar BotVariableEngine
- [ ] Suportar interpolação em todas as mensagens do bot
- [ ] Criar condições avançadas nos fluxos (ex: se fora de horário → mensagem diferente)
- [ ] Persistir variáveis customizadas na sessão Redis

---

### 4.2 Webhooks no Fluxo do Bot

**O que o Typebot faz:** Em qualquer ponto do fluxo, pode chamar uma API externa, pegar a resposta, e usar no fluxo.

**Como absorver:**

```javascript
// flow-handler.js — Permitir chamadas a APIs externas nos fluxos
async callExternalWebhook(url, method, payload) {
  try {
    const response = await axios({
      method: method || 'POST',
      url,
      data: payload,
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    this.logger.error(`Webhook falhou: ${url}`, error.message);
    return null;
  }
}

// Exemplo de uso: consultar sistema externo antes de abrir ticket
async handleTicketCreation(sock, from, session) {
  // Consultar API externa (ex: verificar garantia do equipamento)
  const warrantyCheck = await this.callExternalWebhook(
    'https://api-garantia.empresa.com/check',
    'POST',
    { serial: session.data.equipmentSerial }
  );
  
  if (warrantyCheck?.inWarranty) {
    session.data.priority = 'HIGH';
    await this.sendMessage(sock, from, '✅ Equipamento em garantia! Priorizando atendimento.');
  }
}
```

**Checklist:**
- [ ] Criar helper callExternalWebhook no bot
- [ ] Configurar webhooks de entrada/saída no admin
- [ ] Usar resultado de webhooks para decisões no fluxo

---

## 5. Absorção do Rasa

### 5.1 Intent Detection Simplificada

**O que o Rasa faz:** NLU completo com treinamento de modelo para entender intenções.

**Alternativa mais leve:** Em vez de rodar o Rasa inteiro (Python, ML, servidor separado), usar a API da OpenAI ou Claude para classificar intenções. Muito mais simples e igualmente eficaz.

```javascript
// intent-classifier.js — Classificação leve com LLM
class IntentClassifier {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  }

  async classify(userMessage) {
    const prompt = `Classifique a intenção da mensagem do usuário em um sistema de helpdesk de TI.

Intenções possíveis:
- abrir_ticket_ti: Problemas com computador, rede, sistema, software
- abrir_ticket_eletrica: Problemas elétricos, ar-condicionado, iluminação
- falar_tecnico: Quer falar com uma pessoa
- reservar_equipamento: Quer reservar notebook, projetor, etc
- consultar_faq: Pergunta que pode ser respondida pela FAQ
- consultar_ticket: Quer saber status de um ticket existente
- saudacao: Apenas cumprimentando
- outro: Não se encaixa em nenhuma

Mensagem do usuário: "${userMessage}"

Responda APENAS com o nome da intenção, nada mais.`;

    // Chamar API (OpenAI ou Claude)
    const intent = await this.callLLM(prompt);
    return intent.trim().toLowerCase();
  }

  async classifyWithEntities(userMessage) {
    const prompt = `Analise a mensagem e extraia intenção e entidades.

Mensagem: "${userMessage}"

Responda em JSON:
{
  "intent": "abrir_ticket_ti",
  "confidence": 0.95,
  "entities": {
    "equipamento": "impressora",
    "problema": "não liga",
    "setor": "RH"
  }
}`;

    const result = await this.callLLM(prompt);
    return JSON.parse(result);
  }
}
```

```javascript
// flow-handler.js — Usar classificação quando menu não é reconhecido
async handleMessage(sock, from, text, msg) {
  const normalizedText = text.trim().toLowerCase();

  // Se não é um comando de menu (1-5), tentar classificar intenção
  if (!['1','2','3','4','5','menu'].includes(normalizedText)) {
    const intent = await this.intentClassifier.classify(text);
    
    switch (intent) {
      case 'abrir_ticket_ti':
        // Ir direto para fluxo de ticket TI
        session.data.ticketType = 'ti';
        return this.handleTicketFlow(sock, from, session);
        
      case 'reservar_equipamento':
        return this.handleReservationFlow(sock, from, session);
        
      case 'consultar_faq':
        // Buscar na FAQ e responder
        const answer = await this.searchFaq(text);
        if (answer) {
          await this.sendMessage(sock, from, answer);
          return;
        }
        break;
        
      case 'saudacao':
        await this.sendMenu(sock, from);
        return;
    }
  }
  
  // Fallback: menu padrão
  // ...
}
```

**Checklist:**
- [ ] Criar IntentClassifier service
- [ ] Configurar API key (OpenAI ou Anthropic)
- [ ] Integrar no handleMessage como fallback após menu
- [ ] Criar lista de intenções específicas para o negócio
- [ ] Busca na FAQ por similaridade semântica
- [ ] Log de classificações para melhorar ao longo do tempo

---

## 6. Plano de Implementação Priorizado

### Fase 1 — Fundação (2 semanas)
*Itens que melhoram a base do sistema e são pré-requisitos para o resto.*

| # | Feature | Origem | Impacto | Esforço |
|---|---------|--------|---------|---------|
| 1 | RBAC com roles customizáveis | Peppermint | ⭐⭐⭐ | Médio |
| 2 | Sistema de Webhooks de saída | Chatwoot/Peppermint | ⭐⭐⭐ | Médio |
| 3 | Model Contact unificado + histórico | Chatwoot | ⭐⭐⭐ | Baixo |
| 4 | Respostas prontas (Canned Responses) | Chatwoot | ⭐⭐ | Baixo |

### Fase 2 — Automação (2 semanas)
*Sistema nervoso do helpdesk — faz tudo funcionar mais inteligente.*

| # | Feature | Origem | Impacto | Esforço |
|---|---------|--------|---------|---------|
| 5 | Engine de Automação (event→condition→action) | Chatwoot | ⭐⭐⭐ | Alto |
| 6 | Auto-atribuição de agentes | Chatwoot | ⭐⭐⭐ | Médio |
| 7 | CSAT (pesquisa de satisfação) | Chatwoot | ⭐⭐⭐ | Médio |
| 8 | Notas internas + @mentions | Chatwoot | ⭐⭐ | Baixo |

### Fase 3 — Intelligence (2 semanas)
*Tornar o sistema mais inteligente e proativo.*

| # | Feature | Origem | Impacto | Esforço |
|---|---------|--------|---------|---------|
| 9 | Intent Detection (LLM) | Rasa | ⭐⭐⭐ | Médio |
| 10 | Métricas por agente | Chatwoot | ⭐⭐⭐ | Médio |
| 11 | Labels/Tags em tickets | Chatwoot | ⭐⭐ | Baixo |
| 12 | Variáveis dinâmicas no bot | Typebot | ⭐⭐ | Baixo |

### Fase 4 — Canais & Knowledge (2 semanas)
*Expandir canais e base de conhecimento.*

| # | Feature | Origem | Impacto | Esforço |
|---|---------|--------|---------|---------|
| 13 | Email-to-ticket (IMAP) | Chatwoot/Peppermint | ⭐⭐ | Alto |
| 14 | Knowledge Base/Wiki interno | Peppermint | ⭐⭐ | Médio |
| 15 | Busca FAQ com sugestão ao técnico | Chatwoot | ⭐⭐ | Médio |
| 16 | Server Logs no admin | Peppermint | ⭐ | Baixo |

### Fase 5 — Polish (1 semana)
*Refinamentos e extras.*

| # | Feature | Origem | Impacto | Esforço |
|---|---------|--------|---------|---------|
| 17 | Bloqueio de contatos spam | Chatwoot | ⭐ | Baixo |
| 18 | Som de notificação customizável | Chatwoot | ⭐ | Baixo |
| 19 | Macros (ações em lote) | Chatwoot | ⭐ | Médio |
| 20 | Live View (conversas ativas) | Chatwoot | ⭐ | Médio |

---

## 7. Estimativas e Dependências

### Relação com o V2 (IMPLEMENTATION_PLAN_V2.md)

Este plano de absorção **complementa** o V2, não o substitui. Recomendação de sequência:

1. **Primeiro:** Completar Sprints 1-3 do V2 (correções críticas, segurança, performance)
2. **Depois:** Iniciar Fase 1-2 da absorção (RBAC melhorado, automação, CSAT)
3. **Em paralelo:** Sprint 6-7 do V2 (mídia + notificações) podem rodar junto com Fase 3-4

### Dependências Técnicas

| Feature | Depende de |
|---------|-----------|
| Automação Engine | RBAC (precisa saber quem pode criar regras) |
| CSAT | Fluxo de resolução de ticket funcional |
| Email-to-ticket | Webhooks de saída (para notificar) |
| Intent Detection | API key de LLM (OpenAI ou Anthropic) |
| Métricas por agente | Model Contact + timestamps corretos nos tickets |
| Knowledge Base | RBAC (controle de quem edita) |

### Pacotes NPM Necessários

```bash
# Backend
npm install imap mailparser           # Email ingestion
npm install web-push                   # Push notifications (já no V2)
npm install crypto                     # HMAC para webhooks

# Frontend
npm install @uiw/react-md-editor      # Editor markdown para Knowledge Base
npm install sonner                     # Toast notifications (já no V2)
```

### Estimativa Total

| Fase | Duração | Novas Features |
|------|---------|----------------|
| Fase 1 — Fundação | 2 semanas | 4 features |
| Fase 2 — Automação | 2 semanas | 4 features |
| Fase 3 — Intelligence | 2 semanas | 4 features |
| Fase 4 — Canais & Knowledge | 2 semanas | 4 features |
| Fase 5 — Polish | 1 semana | 4 features |
| **Total** | **~9 semanas** | **20 features** |

Combinado com o V2 (5 semanas), o sistema completo levaria aproximadamente **3-4 meses** para ficar robusto.

---

> **Nota:** Este documento é um plano vivo. Ajustar prioridades conforme feedback dos usuários e necessidades do negócio. As features marcadas como ⚪ podem ser descartadas se não houver demanda real.
