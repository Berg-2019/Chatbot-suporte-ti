# Auditoria Frontend ↔ Backend (2026-05-10)

> Análise cruzada completa entre `profile-driven-app` (frontend atual) e `backend` (NestJS).
> Objetivo: identificar endpoints quebrados, código morto, gaps de implementação e prioridades.

---

## 1. Endpoints do Frontend Quebrados ou Inexistentes

### 1.1 — Módulo AI deletado (3 endpoints → 404)

O `aiService` em `profile-driven-app/src/lib/api.ts:133-135` chama 3 endpoints que **não existem mais** no backend (módulo `adaptive-ai` + serviços IA foram removidos no commit `74dafc0`):

| Frontend | Arquivo | Backend |
|----------|---------|---------|
| `GET /ai/reply-suggestions/{ticketId}` | `chat/$ticketId.tsx:175` | ❌ 404 |
| `GET /ai/analytics` | `api.ts:135` | ❌ 404 |
| `POST /ai/feedback` | `chat/$ticketId.tsx:391`, `api.ts:134` | ❌ 404 |

**Impacto:** `chat/$ticketId.tsx` tenta carregar sugestões de resposta AI e falha silenciosamente (erro no console). Feedback de classificação de intent não funciona.

**Ação:** Recriar endpoint mínimo `/ai/reply-suggestions/{ticketId}` (pode retornar array vazio por enquanto) ou remover `aiService` do frontend.

### 1.2 — Path mismatch: Assets scan

| Frontend | Backend |
|----------|---------|
| `GET /assets/scan/{tag}` (`api.ts:86`) | `GET /assets/tag/{tag}` (`assets.controller.ts:51`) |

**Ação:** Alinhar um dos lados. Recomendo alterar backend para `@Get('scan/:tag')` (mais semântico).

### 1.3 — Path mismatch: Knowledge FAQ search

| Frontend | Backend |
|----------|---------|
| `GET /knowledge/faq/search?q=` (`api.ts:192`) | `GET /knowledge/search?q=` (`knowledge.controller.ts:165`) |

**Ação:** Frontend deve chamar `/knowledge/search` ou backend deve adicionar alias `/faq/search`.

### 1.4 — HTTP method mismatch: Ticket status

| Frontend | Backend |
|----------|---------|
| `PATCH /tickets/{id}/status` (`chat/$ticketId.tsx:381`) | `PUT /tickets/{id}/status` (`tickets.controller.ts:139`) |

**Ação:** Alinhar. Recomendo alterar backend para `@Patch` (mais RESTful para atualização parcial).

---

## 2. WebSocket Desconectado

O frontend define `src/lib/socket.ts` com Socket.IO client (`getSocket()`, `connectSocket()`, `disconnectSocket()`) mas **nenhum componente importa esse módulo**.

**Impacto:** Todas as atualizações em tempo real estão inativas:
- Novas mensagens não aparecem sem refresh
- Status de ticket não atualiza em tempo real
- Notificações de agent status não chegam

O backend tem 2 gateways ativos:
- `EventsGateway` — eventos de ticket, mensagens, agent status
- `TeamChatGateway` — namespace `/team-chat`, mensagens por setor

**Ação:** Importar e usar `socket.ts` nos componentes de chat e tickets. Subscrever eventos `message:new`, `ticket:updated`, `agent:status:changed`.

---

## 3. Páginas Frontend sem Integração Backend

| Rota | Arquivo | Situação |
|------|---------|----------|
| `/purchases/$id` | `purchases.$id.tsx` | Placeholder, não chama API |
| `/safety` | `safety.tsx` | NR-10/NR-35 checklists em state local apenas, não persiste |
| `/manual-service` | `manual-service.tsx` | `setTimeout` demo, não salva no backend |
| Componente | `LoansPanel.tsx` | Usa `mockLoans` hardcoded |
| Componente | `AssistantPanel.tsx` | Demo mode (TODO: conectar Hermes) |
| Componente | `ProfileCard.tsx` | Atualiza apenas localStorage |

---

## 4. Módulos Backend sem Consumidor no Frontend

~**150 endpoints** em ~20 módulos backend não são chamados pelo `profile-driven-app`. Alguns são internos (consumidos por Hermes/bot), outros aguardam implementação no frontend.

### 4.1 — Módulos internos (OK, sem frontend necessário)

| Módulo | Endpoints | Consumidor |
|--------|-----------|------------|
| **Hermes** | 11 | WhatsApp bot via API key |
| **Intent** | 5 | Hermes chama internamente |
| **Auto-Assignment** | 4 | Trigger automático |
| **Webhooks** | 8 | Integração externa |
| **Automation** | 9 | Engine automática |
| **Bot Variables** | 8 | Config do Hermes |
| **Email Config** | 6 | Admin tool |

### 4.2 — Módulos sem frontend (aguardam implementação)

| Módulo | Endpoints | Comentário |
|--------|-----------|------------|
| **Parts** | 8 | Possivelmente substituído por Stock |
| **Printers** | 7 | Migração para Assets planejada |
| **Reservations** | 8 | Fluxo de reserva de equipamentos |
| **Canned Responses** | 8 | Respostas rápidas no chat |
| **CSAT** | 7 | Pesquisa de satisfação pós-atendimento |
| **Agent Metrics** | 4 | Dashboard de métricas por agente |
| **Labels** | 7 | Tags em tickets |
| **Macros** | 2 | Ações em massa |
| **Live View** | 5 | Monitoramento em tempo real |
| **Notification Preferences** | 3 | Config de notificações |
| **Settings** | 8 | Config gerais do sistema |
| **Technical Reports** | 13 | Laudos NR-10/NR-35 (backend criado, frontend usa `technicalReportsService`) |
| **Licenses** | 8 | Gestão de licenças de software |
| **Reports** | 6 | Relatórios agregados + recipients |
| **Tools** | 8 | Empréstimo de ferramentas |

---

## 5. Código Morto no Backend

### 5.1 — Arquivos com zero imports (remover)

| Arquivo | Linhas | Razão |
|---------|--------|-------|
| `common/interceptors/cache.interceptor.ts` | 68 | Nunca registrado em nenhum módulo |
| `common/validators/cpf.validator.ts` | 58 | `@IsCPF` nunca aplicado |
| `common/decorators/require-permissions.decorator.ts` | 33 | Substituído por `@Roles` + `RolesGuard` |
| `common/decorators/trigger-webhook.decorator.ts` | 14 | `@TriggerWebhook` nunca aplicado |
| `common/pipes/file-validation.pipe.ts` | 126 | `FileValidationPipe` nunca usado |
| `presentation/controllers/email-config/email-config.dto.ts` | 137 | Controller define DTOs inline |
| `presentation/controllers/knowledge/knowledge.dto.ts` | 102 | Controller define DTOs inline |
| `presentation/controllers/auth/auth.dto.ts` | 52 | Controller define DTOs inline |
| `application/use-cases/assets/assign-asset.uc.ts` | 53 | Controller chama service direto |
| `application/use-cases/assets/return-asset.uc.ts` | 44 | Controller chama service direto |

### 5.2 — Problemas estruturais

| Problema | Detalhe |
|----------|--------|
| **SectorGuard é no-op** | Aplicado em 9 controllers mas nenhum usa `@Sector()` metadata → sempre retorna `true` |
| **AuditInterceptor duplo** | Registrado em `audit.module.ts` (provider) E `app.module.ts` (`APP_INTERCEPTOR`) — pode executar 2× |
| **Contacts duplicado** | `ContactsController` + `ContactsEnhancedController` no mesmo prefixo `/contacts` — rotas conflitantes |
| **Módulo órfão** | `report-recipients.module.ts` nunca importado no `app.module.ts` (já está em `reports.module.ts`) |
| **Module shell vazio** | `infrastructure/external/external.module.ts` — `providers: [], exports: []` |
| **Diretório vazio** | `presentation/controllers/health/` — 0 arquivos |
| **Import não usado** | `IdempotencyInterceptor` em `main.ts` (registrado via `app.module.ts`) |
| **Variável não usada** | `UUID_REGEX` em `infrastructure/logger/redact.ts` |
| **Referência morta** | `RolesModule` comentado em `app.module.ts:42` aponta para diretório inexistente |

### 5.3 — Violações de arquitetura (controllers com PrismaService direto)

| Arquivo | Nota |
|---------|------|
| `auto-assignment.controller.ts` | Sem camada de service |
| `automation.controller.ts` | Sem camada de service |
| `admin.controller.ts` | Sem camada de service |
| `chat.controller.ts` | Injeta PrismaService para servir mídia |
| `team-chat.service.ts` | Injeta PrismaService direto |

### 5.4 — Guards de autenticação inconsistentes

| Guard | Controllers | Suporta `@SetMetadata('isPublic')` |
|-------|------------|----------------------------------|
| `JwtAuthGuard` (custom) | 7 controllers | Sim |
| `AuthGuard('jwt')` (raw) | ~30 controllers | Não |

Controllers com `AuthGuard('jwt')` não podem marcar rotas como públicas.

### 5.5 — DTOs duplicados/triplicados (Contacts)

`CreateContactDto` definido em 3 lugares com shapes diferentes:
1. `contacts/contacts.dto.ts` (controller local)
2. `domain/dtos/contact/create-contact.dto.ts`
3. `contacts/contacts.service.ts` (interface inline)

---

## 6. Resumo de Endpoints — Frontend vs Backend

### Frontend chama (54 endpoints em `api.ts`)

```
AUTH:      POST /auth/login, GET /auth/me, POST /auth/logout
TICKETS:   GET /tickets, GET /tickets/{id}, PATCH /tickets/{id}/status,
           POST /tickets, POST /tickets/{id}/notes, POST /tickets/{id}/transfer,
           GET /tickets/{id}/history
ASSETS:    GET /assets, GET /assets/{id}, POST /assets/{id}/assign,
           POST /assets/{id}/return, GET /assets/scan/{tag}
CHAT:      GET /chat/conversations, GET /chat/messages/{id},
           POST /chat/messages/{id}, POST /chat/messages/{id}/read
TEAM-CHAT: GET /team-chat/channels, GET /team-chat/messages/{id},
           POST /team-chat/messages/{id}
AI:        GET /ai/reply-suggestions/{id}, POST /ai/feedback, GET /ai/analytics
STOCK:     GET /stock, GET /stock/{id}, POST /stock, PATCH /stock/{id},
           DELETE /stock/{id}, POST /stock/{id}/entry, POST /stock/{id}/exit,
           GET /stock/movements, GET /stock/stats
KNOWLEDGE: GET /knowledge/faq/search, GET /knowledge/articles/{id}
PURCHASES: GET /purchase-requests, GET /purchase-requests/{id},
           POST /purchase-requests, PATCH /purchase-requests/{id}/approve,
           PATCH /purchase-requests/{id}/reject, PATCH /purchase-requests/{id}/mark-purchased,
           PATCH /purchase-requests/{id}/mark-delivered
ADMIN:     GET /users, POST /users, PATCH /users/{id},
           GET /metrics/dashboard, GET /admin/logs
SLA:       GET /sla/policies, GET /sla/dashboard, GET /sla/tickets/{id}
PUSH:      POST /push/subscribe, POST /push/unsubscribe
```

### Backend expõe (~200 endpoints em 40 módulos)

Ver inventário completo em [`IMPLEMENTATION_PLAN_V3.md`](../IMPLEMENTATION_PLAN_V3.md) § módulos.

---

## 7. Priorização

### Prioridade 1 — Corrigir hoje (6 endpoints quebrados + WebSocket)

1. Corrigir `/assets/scan/` → `/assets/tag/` (ou vice-versa)
2. Corrigir `/knowledge/faq/search` → `/knowledge/search` (ou vice-versa)
3. Corrigir `PATCH` → `PUT` em `/tickets/{id}/status` (ou vice-versa)
4. Recriar `/ai/reply-suggestions/{ticketId}` (ou remover `aiService`)
5. Remover `GET /ai/analytics` e `POST /ai/feedback` do frontend
6. Conectar `socket.ts` nos componentes de chat

### Prioridade 2 — Limpar código morto (1-2 dias)

7. Deletar 10 arquivos sem uso
8. Corrigir AuditInterceptor duplo
9. Unificar controllers de Contacts
10. Remover módulo/referências órfãs

### Prioridade 3 — Implementar frontend para módulos existentes (semanas)

11. ~20 módulos backend com zero UI no frontend atual
12. Cada módulo requer: rota, componente, service, TanStack Query hooks

---

## Inventário do Backend (40 módulos, ~200 endpoints)

| # | Módulo | Endpoint Base | Endpoints | Frontend Usa? |
|---|--------|--------------|-----------|---------------|
| 1 | Health | `/health` | 1 | Não |
| 2 | Auth | `/auth` | 6 | Sim |
| 3 | Tickets | `/tickets` | 13 | Parcial |
| 4 | Messages | `/tickets/:ticketId/messages` | 2 | Não (usa Chat) |
| 5 | Users | `/users` | 9 | Parcial |
| 6 | Parts | `/parts` | 8 | Não |
| 7 | FAQ | `/faq` | 8 | Não |
| 8 | Metrics | `/metrics` | 4 | Parcial |
| 9 | Contacts | `/contacts` | 14+14 | Não |
| 10 | Team Chat | `/team-chat` | 5 | Parcial |
| 11 | Chat | `/chat` | 7 | Parcial |
| 12 | Purchases | `/purchases` | 9 | Não |
| 13 | Suppliers | `/suppliers` | 5 | Não |
| 14 | Purchase Requests | `/purchase-requests` | 8 | Sim |
| 15 | Reports | `/reports` | 2 | Não |
| 16 | Report Recipients | `/reports/recipients` | 4 | Não |
| 17 | Stock | `/stock` | 10 | Sim |
| 18 | Reservations | `/reservations` | 8 | Não |
| 19 | Printers | `/printers` | 7 | Não |
| 20 | Canned Responses | `/canned-responses` | 8 | Não |
| 21 | Webhooks | `/webhooks` | 8 | Não |
| 22 | CSAT | `/csat` | 7 | Não |
| 23 | Automation | `/automation` | 9 | Não |
| 24 | Auto-Assignment | `/auto-assignment` | 4 | Não |
| 25 | Intent | `/intent` | 5 | Não |
| 26 | Agent Metrics | `/agent-metrics` | 4 | Não |
| 27 | Labels | `/labels` | 7 | Não |
| 28 | Bot Variables | `/bot-variables` | 8 | Não |
| 29 | Email Config | `/email-config` | 6 | Não |
| 30 | Knowledge | `/knowledge` | 12 | Parcial |
| 31 | Macros | `/macros` | 2 | Não |
| 32 | Live View | `/live-view` | 5 | Não |
| 33 | Notification Prefs | `/notification-preferences` | 3 | Não |
| 34 | Settings | `/settings` | 8 | Não |
| 35 | Hermes | `/hermes` | 11 | Não (interno) |
| 36 | Tools | `/tools` | 8 | Não |
| 37 | Assets | `/assets` | 10 | Parcial |
| 38 | Licenses | `/licenses` | 8 | Não |
| 39 | SLA | `/sla` | 12 | Parcial |
| 40 | Push | `/push` | 2 | Sim |
| 41 | Technical Reports | `/technical-reports` | 13 | Parcial |
| 42 | Admin | `/admin` | 8 | Parcial |
