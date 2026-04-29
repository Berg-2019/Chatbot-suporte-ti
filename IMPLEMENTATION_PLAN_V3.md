# Plano de Implementação V3 — Helpdesk MSM

> Sucessor fundamentado do `IMPLEMENTATION_PLAN_V2.md`
> Base: auditoria QA+Eng do branch `feature/chatbot-upgrade` em 2026-04-28
> Decisões do usuário: Evoluir (não recriar) · CMDB médio · Remover bot legado · Frontend único multi-tenant

---

## Context

O usuário pediu um plano de implementação que (i) parta da base atual do projeto, (ii) recrie o sistema com nova "cara" e novas funções, (iii) elimine o GLPI mantendo sua essência, (iv) seja fundamentado mesmo em discordância. A auditoria mostrou:

- Backend NestJS com **48 models Prisma** já cobrindo ~70% da essência do GLPI (Ticket, StockItem, Printer, Tool, Reservation, KnowledgeArticle, Supplier, Purchase).
- **GLPI integrado em 14 arquivos** via `glpi.service.ts` e `glpi-sync.service.ts` — sync ativo, mas removível.
- **Branch divergido em 135 commits** de `main`, 204 arquivos sem commit, **frontend deletado**, bot legado coexistindo com Hermes (conflito de sessão Baileys).
- **3 vulnerabilidades reais**: IDOR cross-sector em tickets, JWT sem `sector`, sector como String livre.
- **PurchaseRequest** modelado mas **sem CRUD** — bloqueador da fase Compras.

Decisões do usuário formalizadas:

| Questão | Escolha | Implicação |
|---------|---------|-----------|
| Estratégia | Evoluir o atual | Aproveitar 70%, refatorar onde dói |
| CMDB | Médio: ativos + SLA + licenças | ~3 semanas extras vs. mínimo |
| Bot legado | Remover | Hermes 100%, sem fallback |
| Frontends | **Único multi-tenant** | Discorda do V2 (3 repos), reduz overhead |

---

## 1. Onde eu discordo (e por quê)

Antes de começar, o engenheiro precisa cravar discordâncias para você as derrubar com fatos se for o caso. Três pontos:

### 1.1 Discordo de "GLPI desnecessário" — meio certo, meio perigoso

A *interface* do GLPI não é necessária. Mas o GLPI traz **lógicas que você ainda não tem implementadas**:

- **SLA com horário comercial e escalation matrix** — seu schema não tem `SlaPolicy`, `BusinessHours`, `EscalationRule`. Isso é o que mantém ticket dentro do prazo.
- **Histórico de atribuição de ativo a usuário** — você tem `Printer` e `Tool` mas não `AssetAssignment` com timeline.
- **Licenciamento de software** — não modelado.
- **Linkagem ticket↔ativo afetado** — `Ticket` não tem `affectedAssetId`. Hoje, se um técnico atende "minha impressora não imprime", não tem como amarrar isso à impressora física.

**Concordo** que GLPI como sistema externo não cabe mais (sync bidirecional é frágil, dois fontes de verdade, custo de manter PHP+MySQL paralelo). **Discordo** da palavra "desnecessário" — você precisa **substituir**, não apenas **remover**. O plano abaixo faz isso explicitamente.

### 1.2 Discordo do `IMPLEMENTATION_PLAN_V2.md` em "3 frontends separados"

Você já corrigiu isso na sua decisão (frontend único multi-tenant) — só registrando que **concordo com a sua nova decisão e discordo do plano antigo**. Razões:

- 3 repos = 3 CI/CDs, 3 design systems para sincronizar, 3 vezes o overhead de auth/SDK/types.
- "Tema diferente" (azul/dourado/verde) não justifica fork — é CSS variables.
- Diferenças reais de UX entre setores são *rotas e permissões*, não app inteiro.

Risco da escolha multi-tenant: bundle maior; mitigação: code-splitting por rota e lazy-load por sector.

### 1.3 Discordo de "captain-assistant duplicar Hermes"

A auditoria apontou triplicação. Mas há um split limpo possível: **`captain-assistant` resolve tickets tier-1 já abertos** (auto-reply com RAG quando confidence ≥ X), enquanto **Hermes orquestra a conversa do WhatsApp** (interpreta intenção, coleta dados, decide criar ticket ou consultar). Eles operam em camadas diferentes do funil. Mantê-los **com responsabilidades formalizadas** é melhor que apagar um. Detalhe na Fase 5.

---

## 2. Arquitetura-alvo (V3)

```
                  ┌─────────────────────────────────────┐
                  │         NGINX REVERSE PROXY          │
                  │  (Docker, expõe 80/443, wildcard)    │
                  └──┬──────────┬──────────┬──────────┬──┘
                     │ ti.*     │ eletrica.* │ compras.* │ api.*
                     ▼          ▼            ▼            ▼
                  ┌─────────────────────────────┐   ┌──────────┐
                  │  FRONTEND (1 build, mesmo    │   │ BACKEND  │
                  │  container, 3 vhosts no nginx)│   │ NestJS   │
                  │                              │   │          │
                  │  Tema/manifest/ícone por     │   │  Clean   │
                  │  HOST (não por JWT)          │   │  Arch v2 │
                  │  PWA instalável 3x no celular│   │          │
                  └──────────────────────────────┘   └────┬─────┘
                              ▲                            │
                              │ Cookie httpOnly em         │
                              │ .helpdeskmsm.com.br        │
                              │ (SSO entre subdomínios)    │
                              │                            ▼
                                              ┌─────────┬─────────┬──────────┐
                                              │Postgres │ Redis   │ RabbitMQ │
                                              │(Prisma, │(cache,  │(events,  │
                                              │sem GLPI)│SLA timer│push)     │
                                              └─────────┴─────────┴────┬─────┘
                                                                       │
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │   HERMES AGENT      │
                                                            │ (única integração   │
                                                            │  WhatsApp/Baileys)  │
                                                            └────────────────────┘
```

**Domínios em produção:**
- `ti.helpdeskmsm.com.br` — frontend tema azul (TI)
- `eletrica.helpdeskmsm.com.br` — frontend tema dourado (Electric)
- `compras.helpdeskmsm.com.br` — frontend tema verde (Compras)
- `api.helpdeskmsm.com.br` — backend NestJS (compartilhado)
- Certificado: **wildcard** `*.helpdeskmsm.com.br` (Let's Encrypt via DNS-01).

**Mudanças vs hoje:**
- Camada `application/` (use cases) que hoje não existe — controllers vão emagrecer.
- `glpi.service.ts` e `glpi-sync.service.ts` **deletados**.
- Pasta `bot/` **deletada**.
- Frontend único em código, **separado em 3 subdomínios** servidos pelo nginx (substitui os 3 repos do V2).
- Tema/manifest/ícone determinados pelo **host**, não pelo JWT — simplifica `ThemeContext`.
- SSO real via cookie no domínio pai `.helpdeskmsm.com.br` (técnico com múltiplos roles loga 1x).

---

## 3. Schema do CMDB nativo (essência GLPI sem GLPI)

Adicionar ao `schema.prisma` — sem quebrar models existentes.

```prisma
// ===== CMDB =====
model Asset {
  id              String        @id @default(uuid())
  tag             String        @unique          // patrimônio
  serialNumber    String?       @unique
  name            String
  category        AssetCategory
  status          AssetLifecycle @default(IN_USE)
  sector          Sector                          // <- enum, não String
  location        String?
  manufacturer    String?
  model           String?
  purchaseDate    DateTime?
  warrantyEndsAt  DateTime?
  notes           String?

  currentUserId   String?
  currentUser     User?         @relation("AssetCurrentOwner", fields:[currentUserId], references:[id])

  assignments     AssetAssignment[]
  tickets         Ticket[]      @relation("AssetTickets")
  licenses        LicenseAssignment[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([sector, status])
  @@index([category])
}

enum AssetCategory {
  COMPUTER
  LAPTOP
  PRINTER
  PHONE
  PERIPHERAL
  NETWORK_DEVICE
  ELECTRICAL_TOOL    // NR-10/35
  OTHER
}

enum AssetLifecycle {
  IN_STOCK           // recebido, não distribuído
  IN_USE
  IN_MAINTENANCE
  RETIRED
  LOST
}

model AssetAssignment {  // histórico
  id           String   @id @default(uuid())
  assetId      String
  asset        Asset    @relation(fields:[assetId], references:[id])
  userId       String
  user         User     @relation(fields:[userId], references:[id])
  assignedAt   DateTime @default(now())
  returnedAt   DateTime?
  reason       String?
  @@index([assetId, returnedAt])
}

model License {
  id             String   @id @default(uuid())
  software       String
  vendor         String?
  licenseKey     String?  // criptografado em rest, ver §5
  type           LicenseType
  seats          Int      @default(1)
  expiresAt      DateTime?
  cost           Decimal? @db.Decimal(10,2)
  assignments    LicenseAssignment[]
  @@index([expiresAt])
}

enum LicenseType { PERPETUAL  SUBSCRIPTION  OEM  VOLUME }

model LicenseAssignment {
  id          String   @id @default(uuid())
  licenseId   String
  license     License  @relation(fields:[licenseId], references:[id])
  assetId     String?
  asset       Asset?   @relation(fields:[assetId], references:[id])
  userId      String?
  assignedAt  DateTime @default(now())
}

// ===== SLA =====
model SlaPolicy {
  id                  String   @id @default(uuid())
  name                String
  sector              Sector
  priority            Priority
  responseTimeMins    Int      // tempo para 1ª resposta
  resolutionTimeMins  Int      // tempo para fechar
  businessHoursId     String?
  businessHours       BusinessHours? @relation(fields:[businessHoursId], references:[id])
  active              Boolean  @default(true)
  @@unique([sector, priority])
}

model BusinessHours {
  id          String   @id @default(uuid())
  name        String
  timezone    String   @default("America/Sao_Paulo")
  schedule    Json     // { mon: [{start:"08:00", end:"18:00"}], ... }
  holidays    Json?    // ["2026-12-25", ...]
  policies    SlaPolicy[]
}

model SlaTimer {           // 1:1 com Ticket
  ticketId            String   @id
  ticket              Ticket   @relation(fields:[ticketId], references:[id])
  policyId            String
  startedAt           DateTime @default(now())
  pausedAt            DateTime?
  resumedAt           DateTime?
  responseDueAt       DateTime
  resolutionDueAt     DateTime
  responseMetAt       DateTime?
  resolutionMetAt     DateTime?
  responseBreached    Boolean  @default(false)
  resolutionBreached  Boolean  @default(false)
  @@index([responseDueAt, responseMetAt])
  @@index([resolutionDueAt, resolutionMetAt])
}

model EscalationRule {
  id              String   @id @default(uuid())
  name            String
  sector          Sector
  triggerAfterMins Int     // depois de quanto tempo sem ação
  triggerOn       EscalationTrigger
  action          Json     // { type:"NOTIFY_MANAGER" } | { type:"REASSIGN", level:"L2" }
  active          Boolean  @default(true)
}

enum EscalationTrigger {
  NO_RESPONSE
  NO_RESOLUTION
  SLA_BREACH_IMMINENT
  SLA_BREACHED
}

// ===== Sector como ENUM (corrigir String livre) =====
enum Sector { TI  ELECTRIC  COMPRAS }
```

Migration: `add_cmdb_sla_and_sector_enum`. Inclui um `ALTER TABLE` com `USING sector::"Sector"` para converter String → enum (com fallback `'TI'` para nulos).

**Adições obrigatórias em models existentes:**
- `Ticket`: `affectedAssetId String?`, relação `affectedAsset Asset? @relation("AssetTickets")`, `slaTimer SlaTimer?`.
- `User`: relação inversa `assetsOwned Asset[] @relation("AssetCurrentOwner")` e `assetAssignments AssetAssignment[]`.

---

## 4. Fases de implementação

### Fase 0 — Estabilização (semana 1) — **PRÉ-REQUISITO DE TUDO**

**Por que primeiro:** com 135 commits ahead de main e 204 arquivos sujos, qualquer feature nova entra num campo minado.

- [ ] Commit/stash do estado atual (`feat: snapshot before V3 plan`).
- [ ] Rebase de `feature/chatbot-upgrade` em `main` resolvendo conflitos. Não usar `--force` em `main`.
- [ ] **Fix de segurança IDOR** em `tickets.controller.ts`: aplicar `SectorGuard` + validar `query.sector === user.sector` (admins exceto). Arquivo: [tickets.controller.ts:37-55](backend/src/presentation/controllers/tickets/tickets.controller.ts#L37-L55).
- [ ] **JWT inclui `sector` e `role`**: [auth.service.ts](backend/src/presentation/controllers/auth/auth.service.ts) — adicionar ao payload em `login()`. Importante para a Fase 6 (validação host vs sector + SSO multi-subdomínio).
- [ ] **Sector → enum**: migration + refactor das 4 referências (`User.sector`, `Contact.sector`, `Purchase.sector`, `PurchaseRequest.sector`).
- [ ] **Limpeza de docs**: criar pasta `docs/archive/` e mover os 32 `.md` deletados que ainda têm valor histórico (ou commitar a deleção com mensagem explícita).
- [ ] Setup mínimo de Jest unit (não E2E) com 1 spec exemplo em [tickets.service.ts](backend/src/presentation/controllers/tickets/tickets.service.ts) para destravar TDD nas próximas fases.

**Critério de done:** branch limpo, CI verde, IDOR corrigido, sector é enum.

### Fase 1 — Remover bot legado + GLPI (semana 2)

**Bot legado (1 dia):**
- [ ] Remover serviço `bot` de `docker-compose.dev.yml` ([linhas 234-263](docker-compose.dev.yml#L234-L263)) e `docker-compose.yml`.
- [ ] `git rm -r bot/`.
- [ ] Migrar qualquer lógica útil de `bot/src/handlers/flow-handler.js` para skill Hermes (se houver — provável que não, já está em skills).
- [ ] Atualizar `CLAUDE.md` removendo referências.

**GLPI (4 dias):** os 14 arquivos com referência GLPI:

| Arquivo | Ação |
|---------|------|
| `infrastructure/external/glpi.service.ts` | DELETE |
| `infrastructure/services/glpi-sync.service.ts` | DELETE |
| `infrastructure/external/external.module.ts` | Remover provider GLPI |
| `presentation/controllers/tickets/tickets.service.ts` | Remover chamadas `glpi.create()`, manter só Prisma |
| `presentation/controllers/users/users.service.ts` | Remover sync de usuários |
| `presentation/controllers/auth/auth.service.ts` | Auth puramente local (já é JWT, GLPI era enrichment) |
| `presentation/controllers/messages/messages.service.ts` | Remover GLPI |
| `presentation/controllers/purchases/purchases.service.ts` | Remover |
| `presentation/controllers/metrics/metrics.service.ts` | Remover |
| `presentation/controllers/bot/bot.controller.ts` | Remover |
| `infrastructure/services/incoming-messages.consumer.ts` | Remover |
| `infrastructure/services/ticket-creation.consumer.ts` | Remover |
| `infrastructure/services/alert.service.ts` | Remover |
| `main.ts` | Remover bootstrap GLPI |

- [ ] Remover env vars `GLPI_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN` de `.env.example`, `.env`, secrets.
- [ ] Remover `glpi` do `docker-compose` se subido aqui (verificar — produção usa `glpi.helpdeskmsm.com.br` separado, então provavelmente não está nesse compose).
- [ ] Atualizar nginx para remover proxy `/glpi` se existir.
- [ ] Tests de regressão: criar ticket, listar tickets, autenticar — confirmar que não quebrou.

**Critério de done:** `grep -ri "glpi" backend/src/ bot/` retorna vazio (exceto comentários). Pasta `bot/` não existe.

### Fase 2 — CMDB nativo (semana 3)

- [ ] Migration `add_cmdb_models` com `Asset`, `AssetAssignment`, `License`, `LicenseAssignment` + enums.
- [ ] Módulo `assets/` em `presentation/controllers/assets/` com:
  - `assets.controller.ts` — CRUD + `POST /:id/assign` + `POST /:id/return`
  - `assets.service.ts` — usa `application/use-cases/assign-asset.uc.ts`
  - `assets.dto.ts` — com `class-validator`
- [ ] Módulo `licenses/` com CRUD + assignment a Asset/User.
- [ ] Adicionar `affectedAssetId` em `Ticket` (migration).
- [ ] Importar dados existentes: criar Assets a partir dos `Printer` existentes (script idempotente em `prisma/seeds/migrate-printers-to-assets.ts`). Manter `Printer` como model legado por uma sprint, então deletar.
- [ ] Tests unit dos use cases (assign, return, history).

**Critério de done:** consigo cadastrar um computador, atribuir a um usuário, abrir um ticket linkado a esse computador, ver o histórico.

### Fase 3 — SLA Engine (semana 4)

- [ ] Migration `add_sla` com `SlaPolicy`, `BusinessHours`, `SlaTimer`, `EscalationRule`.
- [ ] Service `SlaCalculatorService` em `infrastructure/sla/` — calcula `responseDueAt`/`resolutionDueAt` respeitando business hours (timezone, fins de semana, feriados). Use `date-fns-tz` ou `dayjs` com `business-time` plugin.
- [ ] Hook em `TicketsService.create()` → cria `SlaTimer` automaticamente baseado em `sector`+`priority`.
- [ ] Hook em `TicketsService.updateStatus()` → marca `responseMetAt` ao primeiro IN_PROGRESS, `resolutionMetAt` ao RESOLVED. Pausa o timer em status WAITING_USER.
- [ ] **Worker SLA** (cron job a cada minuto) em `infrastructure/jobs/sla-breach.job.ts`:
  - Detecta breaches imminent (80% do prazo)
  - Detecta breaches efetivos
  - Aplica `EscalationRule` correspondente (notify, reassign)
  - Emite via WebSocket + dispara Hermes para WhatsApp do gestor
- [ ] Endpoints: `GET /sla/policies`, `POST /sla/policies`, `GET /sla/dashboard` (métricas).
- [ ] Seeds: 6 SlaPolicy padrão (3 sectors × 2 prioridades mínimas).

**Critério de done:** ticket criado fora do horário comercial não conta minutos no SLA até segunda 8h. Breach iminente notifica.

### Fase 4 — PurchaseRequest CRUD + workflow (semana 5)

- [ ] Adicionar `PURCHASED` e `DELIVERED` ao enum `PurchaseRequestStatus` (migration).
- [ ] Adicionar `ticketId` (relação opcional com `Ticket`) e `requestedById` (faltam no schema atual). Schema atual tem `approvedById`/`rejectedById` mas não tem o solicitante.
- [ ] Módulo `purchase-requests/` (não confundir com `purchases/` que já existe — compras realizadas).
- [ ] Endpoints (todos com guards):
  - `POST /purchase-requests` — `@Roles(ADMIN_TI, ADMIN_ELECTRIC, AGENT)`
  - `GET /purchase-requests` — `@Roles(ADMIN_COMPRAS)` lista todas; outros veem só do próprio sector
  - `PATCH /:id/approve` — `@Roles(ADMIN_COMPRAS)`
  - `PATCH /:id/reject` — `@Roles(ADMIN_COMPRAS)`, com `rejectionReason` obrigatório
  - `PATCH /:id/mark-purchased` — `@Roles(ADMIN_COMPRAS)`
  - `PATCH /:id/mark-delivered` — `@Roles(ADMIN_COMPRAS, ADMIN_TI, ADMIN_ELECTRIC)`
- [ ] DTOs com `class-validator`.
- [ ] Eventos RabbitMQ ao mudar status (para WebSocket e Hermes notificar solicitante).

**Critério de done:** técnico TI cria requisição → Compras aprova → notificação volta. Tudo via API testada.

### Fase 5 — Hermes orchestration & ownership (semana 6)

Resolver a triplicação. Decisão arquitetural:

| Função | Responsável | Onde mora |
|--------|-------------|-----------|
| Receber WhatsApp / parsear | Hermes (Baileys) | hermes-agent |
| Interpretar intenção | Hermes (LLM) + skill `helpdesk-conversation` | hermes-integration/skills/ |
| Coletar dados de novo ticket | Hermes (skill conversation) | hermes-integration |
| Criar ticket | Backend via bridge | backend-tools/server.js |
| Auto-resolver tier-1 (ticket já criado) | `captain-assistant.service.ts` | backend |
| RAG / KB lookup | `captain-assistant` chamado como **tool do Hermes** | backend (Hermes consulta) |
| Notificar usuário de update | Backend → RabbitMQ → Hermes → WhatsApp | ambos |

Ações:
- [ ] **Implementar skill `helpdesk-conversation`** em `hermes-integration/skills/helpdesk-conversation/SKILL.md` — orquestra as 5 skills atômicas existentes. Esta é a peça que falta hoje.
- [ ] **Idempotência** por `wa_message_id`: tabela `WhatsAppMessageProcessed` com TTL Redis para deduplicar.
- [ ] **Circuit breaker** em [hermes-integration/backend-tools/server.js](hermes-integration/backend-tools/server.js) — usar `opossum` package; se backend cai, Hermes responde "estou com problema técnico, abra um ticket pelo portal" em vez de erro 500.
- [ ] **Captain como tool do Hermes**: novo endpoint `POST /tools/auto-resolve-attempt` no bridge. Hermes chama antes de criar ticket. Se confidence ≥ 0.85, responde diretamente sem abrir chamado.
- [ ] **QR recovery**: script `scripts/hermes-reconnect.sh` para regenerar sessão sem rebuild.
- [ ] Volume `hermes_whatsapp_session` com backup diário.

**Critério de done:** mando "minha impressora não imprime" no WhatsApp → Hermes consulta KB → se não resolve, conversa coleta dados → cria ticket linkado à `Asset` da impressora se eu for o usuário dela → SLA timer dispara.

### Fase 6 — Frontend único multi-tenant em `profile-driven-app` (semanas 7-8)

**Decisão (revisada de novo):** **usar o repo já criado** `https://github.com/Berg-2019/profile-driven-app.git` como o frontend único. Não consolidar 3 repos, não começar do zero — o scaffold já está montado **exatamente** para a arquitetura multi-tenant que decidimos.

**Deploy: tudo local com Docker (sem Cloudflare). 3 subdomínios apontando para o mesmo build.** Implica:
- O `wrangler.jsonc` e o adapter Cloudflare ficam **mortos no repo** — não removo, só não uso (caso queira reativar futuramente).
- Build do frontend é **único** (`bun run build` → `dist/`), servido por **nginx com 3 vhosts** apontando para o mesmo `dist/`.
- O `Host` HTTP do request determina tema/manifest/ícone — frontend lê `window.location.hostname` ou `<meta>` injetado por nginx para descobrir o sector.
- Backend em `api.helpdeskmsm.com.br` — separado dos frontends mas sob mesmo domínio pai → cookies em `.helpdeskmsm.com.br` cobrem todos.
- CORS no backend aceita as 3 origens (`ti.*`, `eletrica.*`, `compras.*`) com `credentials: true`.
- **PWA mobile-first é objetivo central da Fase 6**, não preparação. Técnicos de TI/Elétrica trabalham em campo (chão de fábrica, sala de máquinas, NR-10) — desktop não serve. Tablet e celular são o caso de uso real. **Cada subdomínio instala como PWA distinta** no celular: técnico TI tem ícone azul "Helpdesk TI", de Elétrica tem ícone dourado "Suporte Elétrica" — ambos coexistem na home screen, sem confusão.

#### Inventário do scaffold (estado em 2026-04-28)

```
profile-driven-app/  (TanStack Start · React 19 · Tailwind 4 · Cloudflare Workers · Bun)
├── src/
│   ├── contexts/
│   │   ├── AuthContext.tsx       ← já existe
│   │   └── ThemeContext.tsx      ← já existe (multi-tema)
│   ├── routes/                   ← TanStack Router file-based
│   │   ├── __root.tsx
│   │   ├── login.tsx             ← scaffold de login
│   │   ├── _authed.tsx           ← gate de rotas protegidas
│   │   ├── _authed/              ← rotas autenticadas vão aqui
│   │   └── index.tsx
│   ├── components/               ← shadcn/Radix (todos os componentes principais)
│   ├── hooks/, lib/
│   └── styles.css
├── wrangler.jsonc                ← deploy Cloudflare Workers (edge SSR)
├── components.json               ← config shadcn
└── bunfig.toml, bun.lockb        ← Bun, não npm
```

**Stack confirmado** (da `package.json` / `wrangler.jsonc`):
- **Framework:** TanStack Start (`@tanstack/react-start`) — full-stack com SSR
- **Router:** TanStack Router (file-based, type-safe)
- **UI:** Tailwind 4 + shadcn/ui + Radix (todos os primitives já instalados)
- **Forms:** React Hook Form + Zod (via `@hookform/resolvers`)
- **Data:** TanStack Query 5 + axios
- **Deploy:** Cloudflare Workers (edge)
- **Package manager:** **Bun** (não npm/yarn — ajustar comandos do CLAUDE.md)

**O que está pronto (scaffold):** auth flow, theme provider, protected routing, file structure, design system.
**O que falta:** todas as features de domínio (tickets, assets, requests, SLA, etc.) e a lógica multi-tenant por sector.

#### Sub-fase 6.1 — Dockerizar com 3 subdomínios e conectar ao backend V3 (2-3 dias)

- [ ] **Repo sibling**: `git clone https://github.com/Berg-2019/profile-driven-app.git` em `~/Projetos/profile-driven-app/`. Não submodule (deploy independente).
- [ ] **Build SPA estático** (não SSR Node) — TanStack Router suporta build SPA. Mais simples, perfeito para PWA, nginx serve `dist/` direto. Manter `wrangler.jsonc` arquivado.
- [ ] **Dockerfile multi-stage**:
  ```dockerfile
  FROM oven/bun:1 AS builder
  WORKDIR /app
  COPY package.json bun.lockb ./
  RUN bun install --frozen-lockfile
  COPY . .
  RUN bun run build

  FROM nginx:alpine AS prod
  COPY --from=builder /app/dist /usr/share/nginx/html
  COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf
  COPY public/manifest-{ti,electric,compras}.webmanifest /usr/share/nginx/html/
  ```
- [ ] **Serviço `frontend`** no `docker-compose.dev.yml` e `docker-compose.yml` (mesmo container atende os 3 subdomínios).
- [ ] **nginx vhosts em 4 server blocks** (`nginx/sites-enabled/helpdeskmsm.conf`):
  ```nginx
  # ti.helpdeskmsm.com.br
  server {
    server_name ti.helpdeskmsm.com.br;
    listen 443 ssl http2;
    ssl_certificate     /etc/ssl/wildcard.helpdeskmsm.com.br.crt;
    ssl_certificate_key /etc/ssl/wildcard.helpdeskmsm.com.br.key;

    root /usr/share/nginx/html;
    index index.html;

    # Manifest específico do sector (servido pelo host)
    location = /manifest.webmanifest {
      alias /usr/share/nginx/html/manifest-ti.webmanifest;
      add_header Cache-Control "no-cache";
    }

    # Header injetado para o frontend identificar o sector sem JWT
    add_header X-Frontend-Sector "TI";

    # SPA fallback
    location / {
      try_files $uri $uri/ /index.html;
    }
  }

  # eletrica.helpdeskmsm.com.br — idem com manifest-electric.webmanifest, X-Frontend-Sector ELECTRIC
  # compras.helpdeskmsm.com.br — idem com manifest-compras.webmanifest, X-Frontend-Sector COMPRAS

  # api.helpdeskmsm.com.br — proxy_pass http://backend:3000
  server {
    server_name api.helpdeskmsm.com.br;
    listen 443 ssl http2;
    location / {
      proxy_pass http://backend:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
    location /socket.io/ {
      proxy_pass http://backend:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }
  ```
- [ ] **Identificação do sector no cliente** (sem depender do JWT):
  ```ts
  // src/lib/sector.ts
  export function detectSectorFromHost(): Sector {
    const host = window.location.hostname;
    if (host.startsWith('ti.')) return 'TI';
    if (host.startsWith('eletrica.')) return 'ELECTRIC';
    if (host.startsWith('compras.')) return 'COMPRAS';
    // dev local (porta diferente em vez de subdomínio)
    return (import.meta.env.VITE_DEV_SECTOR as Sector) || 'TI';
  }
  ```
- [ ] **Configurar `VITE_API_URL=https://api.helpdeskmsm.com.br`** em prod, e em dev `http://localhost:3000`.
- [ ] **CORS no backend** ([app.module.ts](backend/src/app.module.ts) ou main.ts) — aceitar as 3 origens com credentials:
  ```ts
  app.enableCors({
    origin: [
      'https://ti.helpdeskmsm.com.br',
      'https://eletrica.helpdeskmsm.com.br',
      'https://compras.helpdeskmsm.com.br',
      // dev
      'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
    ],
    credentials: true,
  });
  ```
- [ ] **Adaptar `AuthContext.tsx`**:
  - Login → `POST https://api.helpdeskmsm.com.br/auth/login` com `withCredentials: true`.
  - Backend seta cookie `helpdesk_session` com:
    ```
    Set-Cookie: helpdesk_session=<jwt>;
                Domain=.helpdeskmsm.com.br;   ← cookie no domínio pai
                Path=/;
                HttpOnly;
                Secure;
                SameSite=Lax
    ```
  - Os 3 subdomínios reusam automaticamente. SSO real.
  - Refresh token via cookie separado (curto vs longo) se backend suportar.
- [ ] Axios global: `withCredentials: true`, `baseURL: import.meta.env.VITE_API_URL`. Sem Authorization header (cookie cuida).
- [ ] **Validação**: backend recebe request de `ti.helpdeskmsm.com.br` para `GET /api/tickets` — guard valida JWT do cookie + valida que `X-Frontend-Sector: TI` (header opcional, defesa em profundidade) bate com `user.sector`. Bloqueia caso COMPRAS tente acessar via subdomínio TI.

#### Sub-fase 6.2 — Multi-tenancy via host + role (2 dias)

Com a separação por subdomínio, **o tema é simplificado** — vem do host, não precisa de lógica reativa que troca quando o usuário muda de role:

- [ ] **`ThemeContext.tsx`** lê o sector via `detectSectorFromHost()` (não JWT) na inicialização e nunca muda durante a sessão:
  ```ts
  const sectorThemes: Record<Sector, Theme> = {
    TI:       { primary: '#1F93FF', accent: '#00E0FF', label: 'Helpdesk TI' },
    ELECTRIC: { primary: '#FFC700', accent: '#FF8C00', label: 'Suporte Elétrica' },
    COMPRAS:  { primary: '#22C55E', accent: '#10B981', label: 'Compras' },
  };

  const sectorFromHost = detectSectorFromHost();
  const theme = sectorThemes[sectorFromHost];
  document.documentElement.setAttribute('data-sector', sectorFromHost);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.primary);
  ```
  Aplicado via CSS variables — Tailwind 4 lê nativo.
- [ ] **Validação cruzada host vs JWT**: ao login, se `user.sector` ≠ `sectorFromHost`, fazer redirect para o subdomínio correto. Ex.: técnico TI tenta acessar `compras.helpdeskmsm.com.br` → backend nega com 403 → frontend redireciona para `ti.helpdeskmsm.com.br`.
- [ ] **Menu profile-driven** baseado em `role` (não sector — sector já é determinado pelo host):
  ```ts
  // src/lib/menu.ts
  export function getMenuItems(role: UserRole, sector: Sector): MenuItem[] {
    // Sector decide as rotas BASE; role decide as ADMIN
    const base = sectorMenus[sector];
    if (role.startsWith('ADMIN_')) base.push(...adminMenus[sector]);
    return base;
  }
  ```
- [ ] **Route gates** em `_authed/` via `beforeLoad`:
  ```ts
  export const Route = createFileRoute('/_authed/admin/sla-policies')({
    beforeLoad: ({ context }) => {
      if (!context.user.role.startsWith('ADMIN_')) throw redirect({ to: '/' });
    },
  });
  ```
- [ ] **Dashboard adaptativo** em `_authed/index.tsx` — widgets via lookup table por sector (já vem do host).

#### Sub-fase 6.3 — Features de domínio (5-7 dias)

Implementar as views, alinhadas aos módulos do backend V3:

| Rota | Quem vê | Backend |
|------|---------|---------|
| `_authed/tickets/` (list + detail + create) | TI, ELECTRIC | `/tickets?sector=...` |
| `_authed/assets/` (list + detail + assign) | TI, ELECTRIC, ADMIN | `/assets` (Fase 2) |
| `_authed/purchase-requests/` (list + detail + approve/reject) | TI/ELECTRIC criam, COMPRAS aprova | `/purchase-requests` (Fase 4) |
| `_authed/knowledge/` (KB + FAQ) | todos | `/knowledge` |
| `_authed/admin/sla-policies/` | ADMIN_* | `/sla/policies` (Fase 3) |
| `_authed/admin/business-hours/` | ADMIN_* | `/sla/business-hours` |
| `_authed/admin/users/` | ADMIN_* | `/users` |
| `_authed/safety/` (checklist NR-10/35) | ELECTRIC | a modelar |
| `_authed/tool-loans/` | ELECTRIC | já existe |
| `_authed/reports/` | COMPRAS, ADMIN | `/metrics`, `/reports` |

- [ ] Para cada rota, fluxo: form (RHF + Zod) → mutation (TanStack Query) → optimistic update → toast.
- [ ] **WebSocket** (Socket.IO client) hook `useTicketUpdates()` invalidando queries em eventos `ticket.updated`, `sla.breach`, `purchase-request.status-changed`.
- [ ] **Captação visual de SLA**: badge no ticket com cor e progresso (verde/amarelo/vermelho) baseado em `responseDueAt` vs agora.

#### Sub-fase 6.4 — PWA mobile-first (3-4 dias)

**Premissa:** o uso real é técnico em campo com celular ou tablet. Desktop é secundário. Cada decisão de UI passa pelo filtro "isso funciona com luva grossa em uma sala mal iluminada?".

##### 6.4.1 — Web App Manifest

**3 manifests separados (um por subdomínio)** — cada PWA instala como app distinto na home screen do celular (3 ícones diferentes, 3 nomes, 3 cores).

- [ ] `public/manifest-ti.webmanifest`:
  ```json
  {
    "name": "Helpdesk TI",
    "short_name": "TI",
    "id": "/?source=pwa-ti",
    "start_url": "/?source=pwa",
    "scope": "/",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#11151C",
    "theme_color": "#1F93FF",
    "categories": ["productivity", "business"],
    "icons": [
      { "src": "/icons/ti/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/ti/icon-512.png", "sizes": "512x512", "type": "image/png" },
      { "src": "/icons/ti/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ],
    "shortcuts": [
      { "name": "Novo ticket", "url": "/tickets/new" },
      { "name": "Meus tickets", "url": "/tickets?mine=1" },
      { "name": "Escanear patrimônio", "url": "/assets/scan" }
    ],
    "share_target": {
      "action": "/tickets/new",
      "method": "POST",
      "enctype": "multipart/form-data",
      "params": { "title": "title", "text": "description", "files": [{"name":"photos","accept":["image/*"]}] }
    }
  }
  ```
- [ ] `public/manifest-electric.webmanifest` — mesmo template, `name: "Suporte Elétrica"`, `theme_color: "#FFC700"`, `icons: /icons/electric/...`, `shortcuts` inclui "Safety checklist" e "Tool loan".
- [ ] `public/manifest-compras.webmanifest` — `name: "Compras"`, `theme_color: "#22C55E"`, `icons: /icons/compras/...`, `shortcuts` inclui "Aprovar requisições" e "Novo fornecedor".
- [ ] **Servir o manifest certo por host** via nginx (alias por server block — já configurado em 6.1).
- [ ] **`id` único por manifest** (`/?source=pwa-ti` vs `/?source=pwa-electric`) — campo PWA crítico que diz ao browser que são 3 PWAs diferentes, não a mesma. Sem isso, instalar a TI sobrescreve a Electric instalada antes.
- [ ] **Shortcuts**: long-press no ícone abre direto nas ações mais usadas. Críticas para velocidade no chão de fábrica.
- [ ] **Share target**: usuário tira foto do problema no app de câmera, clica "Compartilhar → Helpdesk TI" e abre o form de novo ticket com a foto já anexada. Mata 30 segundos por chamado.
- [ ] **Theme color** vai no `<meta>` do `index.html` injetado pelo nginx por server block (sub_filter), ou definido client-side a partir de `detectSectorFromHost()` no `<head>` antes do React hidratar.
- [ ] Ícones — gerar via PWA asset generator (`pwa-asset-generator`) a partir de logo de cada sector. **Atenção**: 3 ícones distintos = 3 logos. Você precisa do design.

##### 6.4.2 — Service Worker (Workbox via `vite-plugin-pwa`)

Usar `vite-plugin-pwa` (compatível com Vite/TanStack Start) com Workbox por baixo. Estratégias:

| Recurso | Estratégia | Razão |
|---------|-----------|-------|
| Build assets (`*.js`, `*.css`) | Precache | Versionados pelo build, nunca mudam |
| `/api/tickets`, `/api/assets` (GET) | Network-first com fallback cache 5min | Dados frescos quando online; quando cai sinal, mostra última versão |
| `POST /api/tickets`, `PATCH /api/*` | **Background Sync** (queue Workbox) | Técnico cria ticket sem sinal → fica na fila → envia quando reconecta |
| `/api/knowledge/*` | Stale-while-revalidate | KB é semi-estática, OK servir cache instantâneo e atualizar em background |
| Fotos / attachments | Cache-first com expiração 7d | Reduz tráfego mobile |
| Páginas `/` | Network-first com `/offline.html` | Fallback se totalmente offline |

- [ ] `public/offline.html` enxuta — mostra ícone, título "Sem conexão", lista de tickets em cache se houver.
- [ ] Registrar SW só em `import.meta.env.PROD` (não atrapalhar HMR).
- [ ] **Update flow**: detectar nova versão do SW → toast "Nova versão disponível [Atualizar]" → reload controlado. Sem isso, técnicos ficam em versão antiga eternamente.

##### 6.4.3 — Features mobile-native via Web APIs

Coisas que só fazem sentido em mobile, encaixadas nos fluxos:

- [ ] **Câmera para anexo de foto** no novo ticket:
  ```html
  <input type="file" accept="image/*" capture="environment" multiple />
  ```
  `capture="environment"` força a câmera traseira no Android/iOS — ideal para fotografar problema de equipamento. Comprimir client-side com `browser-image-compression` antes de enviar (foto de celular pesa 4MB+, comprimir para ~300KB).
- [ ] **Leitor de QR Code para patrimônio** em `/assets/scan` — usar `barcode-detector` API nativa (Chrome/Edge mobile já suporta) com fallback `@zxing/browser`. Técnico aponta câmera no QR colado no equipamento → resolve `Asset.tag` → abre detalhe ou cria ticket linkado. **Mata o problema "qual impressora é essa?"** que é o maior tempo perdido em helpdesk de campo.
- [ ] **Geolocation API** (opcional, com permissão) no campo `location` do ticket — preenche automático "Bloco B, 2º andar" se a empresa mapear coordenadas. Opt-in por usuário.
- [ ] **Web Share API** para compartilhar ticket (`navigator.share({...})`) — útil quando técnico de TI precisa passar caso para Elétrica.
- [ ] **Vibration API** em alertas críticos (SLA breach iminente) — pulso curto quando o app está aberto.

##### 6.4.4 — Push Notifications

Críticas para mobile (técnico não fica olhando o app o dia todo). Mas exige infra:

- [ ] **Server-side**: gerar VAPID keys, adicionar `web-push` no backend NestJS, model `PushSubscription` no Prisma (`{userId, endpoint, p256dh, auth}`).
- [ ] Endpoint `POST /api/push/subscribe` — frontend envia subscription, backend salva.
- [ ] Disparar push em eventos: ticket atribuído, SLA breach iminente, PurchaseRequest aprovado/rejeitado, comentário em ticket próprio. **NÃO** disparar em tudo (fadiga de notificação).
- [ ] **Configurações do usuário** em `/settings/notifications` — opt-in granular por tipo de evento.
- [ ] iOS: push em PWA só funciona em iOS 16.4+ E o usuário precisa ter "Adicionado à tela de início". Documentar limitação.

##### 6.4.5 — UX mobile-first

- [ ] **Touch targets ≥ 44x44px** — auditar com axe-core / Lighthouse.
- [ ] **Bottom navigation** em mobile (não sidebar) — polegar alcança fácil. Sidebar volta em ≥ tablet.
- [ ] **Pull-to-refresh** em listas (TanStack Query `refetch` + lib `react-pull-to-refresh`).
- [ ] **Swipe actions** em ticket cards (swipe esquerda = arquivar, direita = atribuir a mim) — `framer-motion` ou `react-swipeable`.
- [ ] **Safe areas** (iOS notch + Android gesture bar) — `env(safe-area-inset-*)` no CSS root.
- [ ] **Form inputs corretos**: `inputmode="tel"`, `inputmode="numeric"`, `enterkeyhint="search"` etc — teclado mobile correto por campo.
- [ ] **Modo paisagem** liberado para Safety Checklist Electric (assinatura, formulário longo) — orientation manifest = `any` para essa rota específica.
- [ ] **Skeleton screens** em vez de spinners (sensação de velocidade em conexão lenta).
- [ ] **Tablet breakpoint dedicado** (`md:` em Tailwind = 768px+) — split view (lista + detalhe lado a lado) em tablet, stack em celular.

##### 6.4.6 — Performance mobile (3G real)

- [ ] Bundle inicial **≤ 200KB gzip** (não 800KB — mobile 3G demora 4s só para baixar).
- [ ] Code splitting por rota (TanStack Router faz nativo).
- [ ] Lazy load de Capacitor stuff que só Electric usa.
- [ ] Imagens `<img loading="lazy">` + `srcset` responsivo + `sizes`.
- [ ] **Adaptive loading**: detectar `navigator.connection.effectiveType` — em `2g`/`slow-2g` carregar UI minimalista, sem animações.

##### 6.4.7 — Critérios de aceitação PWA mobile

- [ ] Lighthouse mobile (não desktop): Performance ≥ 85, PWA ≥ 95, Accessibility ≥ 95.
- [ ] Instalável em Android Chrome E iOS Safari (testar em device real ou BrowserStack, não só emulador).
- [ ] Funciona **offline** para: ver lista de tickets em cache, criar ticket novo (que será sincronizado quando voltar sinal).
- [ ] Push notification chega em < 5s no Android (medir).
- [ ] Câmera abre direto na traseira no Android.
- [ ] QR scanner reconhece tag em < 1s sob luz ruim.
- [ ] **Teste manual obrigatório**: percorrer prédio MSM com tablet, abrir um ticket, fotografar um equipamento, escanear patrimônio. Se um técnico não-técnico (gerente) consegue, está pronto.

#### Sub-fase 6.5 — QA (1 dia)

- [ ] Tests E2E (Playwright) para os 3 fluxos: TI cria ticket, ELECTRIC faz checklist, COMPRAS aprova request.
- [ ] Audit Lighthouse (Performance ≥ 85, Accessibility ≥ 95, PWA ≥ 90).
- [ ] axe-core: zero erros críticos.
- [ ] Smoke test: subir o stack completo via `docker compose up`, autenticar nos 3 perfis, validar que muda tema e menu.

**Critério de done:** `docker compose up` sobe `frontend + backend + hermes + hermes-tools + postgres + redis + rabbitmq + nginx` e funciona end-to-end. Login como TI mostra UI azul + tickets; login como Electric mostra UI dourada + safety; login como Compras mostra UI verde + requests. App é **instalável como PWA** em Android e iOS, técnico em campo consegue: instalar, escanear QR de equipamento, criar ticket com foto, receber push de SLA breach, criar ticket offline e ver sincronizar quando volta sinal.

**Estimativa:** **2-3 semanas** (subiu meio escala porque PWA mobile-first robusto não é trivial — câmera, push, offline real, QR scanner não são "checkboxes").

#### Dev local — 3 portas simulando 3 subdomínios (decisão do usuário)

Em desenvolvimento local você optou por portas diferentes em `localhost`, não `/etc/hosts` com subdomínios. Isso é mais simples mas **não testa o cookie cross-subdomain do SSO** — um bug de cookie só vai aparecer em staging/prod.

- [ ] **Script `bun run dev:ti / dev:electric / dev:compras`** no `package.json`:
  ```json
  "scripts": {
    "dev:ti":       "VITE_DEV_SECTOR=TI       bun run vite --port 5173",
    "dev:electric": "VITE_DEV_SECTOR=ELECTRIC bun run vite --port 5174",
    "dev:compras":  "VITE_DEV_SECTOR=COMPRAS  bun run vite --port 5175",
    "dev:all":      "concurrently \"bun run dev:ti\" \"bun run dev:electric\" \"bun run dev:compras\""
  }
  ```
- [ ] `detectSectorFromHost()` cai no fallback `import.meta.env.VITE_DEV_SECTOR` em dev.
- [ ] Backend CORS dev aceita as 3 portas.
- [ ] **Mitigação da paridade dev↔prod**: criar um docker-compose alternativo `docker-compose.staging.yml` com nginx + 3 vhosts e instruções de adicionar 3 entradas no `/etc/hosts` antes de cada release maior. Roda 1x antes de cada deploy de produção. Não é dev diário, é smoke test.

#### Mudanças no CLAUDE.md a fazer ao chegar na Fase 6

- Trocar referências a `support-mobile` / `suport-eletric` / `support-compras` por `profile-driven-app`.
- Atualizar tabela de portas:
  | Serviço | Dev | Prod (atrás do nginx) |
  |---------|-----|------------------------|
  | Frontend TI (Bun dev) | 5173 | `ti.helpdeskmsm.com.br` |
  | Frontend Elétrica (Bun dev) | 5174 | `eletrica.helpdeskmsm.com.br` |
  | Frontend Compras (Bun dev) | 5175 | `compras.helpdeskmsm.com.br` |
  | Backend NestJS | 3000 | `api.helpdeskmsm.com.br` |
  | nginx | 80/443 | wildcard `*.helpdeskmsm.com.br` |
- Documentar uso de **Bun** em vez de npm para o frontend.
- Documentar que **Cloudflare Workers / wrangler** estão **arquivados, não usados** no scaffold.
- Documentar **3 PWAs separadas** na home screen do celular (TI azul, Elétrica dourada, Compras verde).

---

## 5. Arquivos críticos para modificar / criar

| Caminho | Ação | Fase |
|---------|------|------|
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) | Adicionar CMDB+SLA+enum Sector; remover refs GLPI | 0, 2, 3 |
| [backend/src/common/guards/sector.guard.ts](backend/src/common/guards/sector.guard.ts) | Aplicar onde falta | 0 |
| [backend/src/presentation/controllers/tickets/tickets.controller.ts](backend/src/presentation/controllers/tickets/tickets.controller.ts) | Fix IDOR + `affectedAssetId` | 0, 2 |
| [backend/src/presentation/controllers/auth/auth.service.ts](backend/src/presentation/controllers/auth/auth.service.ts) | JWT com sector/role | 0 |
| [backend/src/infrastructure/external/glpi.service.ts](backend/src/infrastructure/external/glpi.service.ts) | DELETE | 1 |
| [backend/src/infrastructure/services/glpi-sync.service.ts](backend/src/infrastructure/services/glpi-sync.service.ts) | DELETE | 1 |
| `backend/src/presentation/controllers/assets/` | CRIAR | 2 |
| `backend/src/presentation/controllers/purchase-requests/` | CRIAR | 4 |
| `backend/src/infrastructure/sla/` | CRIAR (calculator, breach detector) | 3 |
| `backend/src/application/use-cases/` | CRIAR camada inteira | 0–4 |
| [docker-compose.dev.yml](docker-compose.dev.yml) | Remover serviço `bot` | 1 |
| [bot/](bot/) | DELETAR pasta | 1 |
| [hermes-integration/skills/](hermes-integration/skills/) | Criar `helpdesk-conversation/` | 5 |
| [hermes-integration/backend-tools/server.js](hermes-integration/backend-tools/server.js) | Circuit breaker + auto-resolve endpoint | 5 |
| `profile-driven-app/` (repo externo) | Conectar ao backend V3 + features de domínio | 6 |

**Reuso identificado (não recriar):**
- `RolesGuard`, `Roles` decorator — já prontos.
- `MinimaxEmbeddingsService`, `RagService` — usar como tool do Hermes (não duplicar).
- `KnowledgeArticle`, `Faq` models — base do KB do CMDB.
- `Reservation`, `ToolLoan` — integram com `Asset` ao migrar.
- `WebhookLog`, `Webhook` — para integrações externas (folha de pagamento, etc.).

---

## 6. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Rebase de 135 commits gera conflito massivo | Alta | Alto | Fase 0 é só rebase; se inviável, plano B = squash em commits temáticos antes de rebasar |
| Remover GLPI quebra criação de ticket em prod | Média | Alto | Feature flag `GLPI_SYNC_ENABLED=false` por 1 sprint antes de deletar código |
| SLA com timezone/feriado é mais difícil que parece | Alta | Médio | Usar lib madura (`@nestjs/schedule` + `business-time` plugin); cobrir feriados de SP+nacionais |
| Hermes perde sessão WhatsApp após deploy | Alta | Alto | Volume persistente já existe; adicionar healthcheck + alerta + script `hermes-reconnect.sh` |
| Frontend único fica lento por carregar tudo | Média | Médio | Code-splitting + lazy routes; orçamento de 800KB inicial |
| Migração de Printer→Asset perde dados | Baixa | Alto | Script idempotente + dry-run + manter `Printer` model 1 sprint como sombra |
| Idempotência WhatsApp falha | Média | Médio | Redis dedup com TTL 24h por `wa_message_id` |
| Service Worker em dev quebra HMR | Média | Baixo | Registrar SW só em PROD (`if (import.meta.env.PROD)`) |
| TanStack Start sem Cloudflare adapter força rework | Baixa | Médio | Stack tem Node adapter nativo; build SPA estático puro também serve |
| nginx mal configurado expõe backend direto | Média | Alto | Whitelisting de paths, deny `/api` direto sem auth via `auth_request` se preciso, security headers |
| Push em iOS PWA exige usuário "Add to Home Screen" | Alta | Médio | Detectar iOS standalone via JS, mostrar tutorial passo-a-passo na primeira visita iOS |
| Background Sync inconsistente entre browsers | Média | Médio | Workbox abstrai; testar em Chrome Android + Safari iOS reais antes de prometer offline |
| QR scanner falha sob luz ruim | Média | Médio | Botão de "lanterna" (`ImageCapture API`); fallback de digitação manual da tag |
| Foto de celular pesa 4MB+ e satura rede | Alta | Médio | Compressão client-side (`browser-image-compression`) para ~300KB antes de upload |
| Token JWT em cookie httpOnly + PWA offline = não consigo deslogar offline | Baixa | Baixo | Documentar; logout offline marca pendência e executa quando volta sinal |
| Dev local (portas) não testa cookie cross-subdomain do SSO | Alta | Médio | Bug de cookie só aparece em staging — `docker-compose.staging.yml` + `/etc/hosts` antes de cada release |
| Wildcard cert `*.helpdeskmsm.com.br` expira/falha | Baixa | Alto | Let's Encrypt DNS-01 com auto-renew via cron + alertas; manter cert antigo 30d antes de descartar |
| Manifest `id` igual entre os 3 sobrescreve PWA instalada | Média | Alto | Validar `id` único por manifest no critério de done; smoke test instalar os 3 no mesmo celular |
| Técnico TI consegue logar em `compras.helpdeskmsm.com.br` (cookie SSO global) | Média | Alto | Backend valida `host` da request vs `user.sector` em todo middleware autenticado; redireciona quando mismatch |

---

## 7. Estimativa total

| Fase | Duração | Acumulado |
|------|---------|-----------|
| 0 — Estabilização | 1 sem | 1 sem |
| 1 — Remover bot+GLPI | 1 sem | 2 sem |
| 2 — CMDB | 1 sem | 3 sem |
| 3 — SLA | 1 sem | 4 sem |
| 4 — PurchaseRequest | 1 sem | 5 sem |
| 5 — Hermes orchestration | 1 sem | 6 sem |
| 6 — Frontend multi-tenant + PWA mobile em `profile-driven-app` | 2-3 sem | **8-9 sem** |

**Comparação:** V2 estimou 5–7 semanas mas (a) ignorou estabilização, (b) ignorou SLA/CMDB, (c) tinha 3 frontends. V3 é mais realista.

---

## 8. Verificação end-to-end

Ao final da Fase 6, rodar este teste manual de aceitação:

1. `docker compose -f docker-compose.dev.yml up -d` — apenas `backend`, `hermes`, `hermes-tools`, infra. **Sem `bot`, sem `glpi`**.
2. `npm run start:dev` no `frontend/`.
3. Login como `tecnico-ti@msm` → vejo tema azul, dashboard TI, lista de meus tickets, meus assets.
4. Login como `compras@msm` → vejo tema verde, fila de PurchaseRequests pendentes.
5. Login como `tecnico-eletrica@msm` → tema dourado, vejo só tickets ELECTRIC e meus assets.
6. WhatsApp: enviar "minha impressora HP do RH não imprime" → Hermes identifica asset → consulta KB → conversa → cria ticket linkado à `Asset` certa → SLA dispara → técnico recebe via WebSocket.
7. Deixar 80% do tempo do SLA passar (forçar via update do `responseDueAt`) → escalation rule notifica gestor via WhatsApp.
8. Técnico resolve → `responseMetAt` e `resolutionMetAt` preenchidos → métrica do dashboard atualiza.
9. Técnico TI cria PurchaseRequest "novo monitor" → Compras aprova → notificação volta ao solicitante por WhatsApp.
10. `grep -ri "glpi" backend/src` → vazio.
11. `ls bot/` → não existe.
12. Tests: `cd backend && npm test` (unit) e `npm run test:e2e` passam.

Se os 12 passos rodam, V3 está pronto.

---

## 9. Próximo passo concreto

Antes de qualquer código: **rebase + IDOR fix** (Fase 0, primeiros 2 dias). Sem isso, qualquer PR seguinte herda o problema. Se você aprovar este plano, começo pela Fase 0 com TodoWrite acompanhando.
