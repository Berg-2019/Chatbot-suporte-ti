# Plano de Integração Frontend → Backend + Implantação

> **Versão:** 1.0 · **Data:** 2026-05-11
> **Escopo:** Fase 6 do [IMPLEMENTATION_PLAN_V3.md](../IMPLEMENTATION_PLAN_V3.md), refeita do zero com o frontend novo `Frontend-chatbot`.
> **Substitui:** intenção dos arquivos arquivados [INTEGRATION_PLAN_LOVABLE.md](../INTEGRATION_PLAN_LOVABLE.md) e [docs/FRONTEND_BACKEND_AUDIT.md](FRONTEND_BACKEND_AUDIT.md) (mantidos como histórico).

---

## Contexto

Após o reset do frontend e troca do repo (`profile-driven-app` → [Berg-2019/Frontend-chatbot](https://github.com/Berg-2019/Frontend-chatbot)), o novo cliente já tem:

- 30+ rotas TanStack file-based cobrindo tickets, chat, assets, knowledge, compras, relatórios, admin, dashboards, safety, stock, team-chat, profile, settings;
- `src/lib/api.ts` com 39 endpoints declarados, cookie httpOnly via `withCredentials: true`, interceptor 401, fallback `API_DISABLED` quando `VITE_API_URL` não está setada;
- AuthContext + ThemeContext + sector detection por host;
- TanStack Query em ~27 consumos (sem `useMutation` ainda).

**Problemas reais a resolver:**

1. **16 dependências de dados fake** no frontend: 8 `catch{ demoData }` em rotas + 8 stores em `localStorage` (`userStore`, `reports`, `audit`, `stock`, `notificationService`, `auth`, etc.) que precisam migrar pra backend ou ser removidas.
2. **5 endpoints faltando** no backend: `GET /tickets/my`, `GET /tickets/:id/history`, `GET /sla/policies`, `GET /sla/dashboard`, `GET /push/vapid-public-key`.
3. **WebSocket sem auth JWT** na handshake e com CORS `*` (frontend usa stub fake em `lib/socket.ts`, precisa client real conectado e seguro).
4. **PWA incompleta**: manifest existe mas sem Service Worker registrado; Web Push (VAPID) só tem stub em `notificationService.ts`.
5. **Sem rate limiting** no backend, sem hardening pra deploy externo.
6. **Não existe nginx config tracked** (`nginx/sites-enabled/helpdeskmsm.conf` nunca foi commitado — AGENTS.md já avisa).

Resultado esperado ao fim das fases: stack 100% integrada, zero mocks/fallbacks fake, PWA instalável com push funcional, deploy reproduzível com 1 comando.

---

## Estado atual (cruzamento front ↔ back)

> **Status 2026-05-11:** Fases A ✅ B ✅ C ✅ D ✅ completas. Stack 100% integrada, zero mocks, PWA funcional.

### Endpoints — gap analysis (resolvidos)

| Recurso | Endpoint esperado pelo front | Backend |
|---|---|---|
| **Auth** | `POST /auth/login`, `GET /auth/me` | ✅ [`auth.controller.ts`](backend/src/presentation/controllers/auth/auth.controller.ts) |
| **Tickets list** | `GET /tickets/my` | ✅ [`GET /tickets/my`](backend/src/presentation/controllers/tickets/tickets.controller.ts) — filtro server-side por `req.user.sector` + `assignedToId` |
| **Ticket detail** | `GET /tickets/:id` | ✅ |
| **Ticket status** | `PATCH /tickets/:id/status` | ✅ |
| **Ticket notes** | `POST /tickets/:id/notes` | ✅ — alias via `ChatService.sendMessage(isInternal=true)` |
| **Ticket history** | `GET /tickets/:id/history` | ✅ — [`TicketHistoryService`](backend/src/infrastructure/services/ticket-history.service.ts) (AuditLog + Message join) |
| **Ticket transfer** | `POST /tickets/:id/transfer` | ✅ |
| **Ticket create** | `POST /tickets` | ✅ |
| **Assets** | `GET /assets`, `GET /assets/:id`, `POST /assets/:id/assign`, `GET /assets/scan/:tag` | ✅ |
| **Chat** | `GET /chat/conversations`, `GET/POST /chat/messages/:ticketId` | ✅ |
| **Team chat** | `GET /team-chat/channels`, `GET/POST /team-chat/messages/:channelId` | ✅ |
| **AI** | `GET /ai/suggestions/:ticketId`, `POST /ai/feedback`, `GET /ai/analytics` | ✅ — `/ai/suggestions/:id` alias criado |
| **Knowledge** | `GET /knowledge/faq/search`, `GET /knowledge/articles/:id` | ✅ |
| **Purchase requests** | 7 endpoints (CRUD + approve/reject/mark-*) | ✅ todos |
| **Users/Admin** | `GET/POST /users`, `PATCH /users/:id`, `GET /metrics/dashboard`, `GET /admin/logs` | ✅ |
| **SLA** | `GET /sla/policies`, `GET /sla/dashboard` | ✅ — [`sla.controller.ts`](backend/src/presentation/controllers/sla/sla.controller.ts) |
| **Push subscribe** | `POST /push/subscribe`, `GET /push/vapid-public-key` | ✅ — [`push.controller.ts`](backend/src/presentation/controllers/push/push.controller.ts) |
| **WebSocket** | `connect`, eventos `message:new`, `ticket:*`, `team:message` | ✅ — JWT cookie auth, CORS allowlist, sector guard em [`events.gateway.ts`](backend/src/presentation/websockets/events.gateway.ts) |

**Resumo:** 5 endpoints REST criados (A1-A6) + WS hardened (A7) + rate limit (A8) + trace-id (D4). Zero gaps restantes.

### Mocks/fallbacks fake no frontend (16 targets — resolvidos)

| # | Arquivo | O que era | Ação |
|---|---|---|---|
| 1 | `src/contexts/AuthContext.tsx` | `DEMO_USERS` (4 usuários hardcoded) | ✅ Removido — login exige backend real; `devLogin()` gateado `import.meta.env.DEV` |
| 2 | `src/lib/userStore.ts` | SEED de 4 usuários demo | ✅ `SEED=[]` (mantido vazio, importado por `dev.index.tsx`) |
| 3 | `src/components/LoansPanel.tsx` | `mockLoans` (4 ferramentas hardcoded) | ✅ Removido — `loansService` conecta backend |
| 4 | `src/routes/_authed/purchases.tsx` | `demoData()` em `catch` | ✅ Removido — `isError` do TanStack Query |
| 5 | `src/routes/_authed/tickets.$id.tsx` | `demoTicket()` no `catch` | ✅ Removido |
| 6 | `src/routes/_authed/chat.$ticketId.tsx` | `demoTicket()` no `catch` | ✅ Removido |
| 7 | `src/routes/_authed/chat.$ticketId.tsx` | `demoMessages` no `catch` | ✅ Removido |
| 8 | `src/routes/_authed/team.tsx` | Demo channels no `catch` | ✅ Removido |
| 9 | `src/routes/_authed/team.tsx` | Demo messages no `catch` | ✅ Removido |
| 10 | `src/routes/_authed/engineer.index.tsx` | Fallback arrays no dashboard | ✅ Removido — empty state real |
| 11 | `src/lib/socket.ts` | Stub fake socket.io | ✅ Client real com cookie JWT |
| 12 | `src/lib/reports.ts` | `technical_reports` em localStorage | ✅ `technicalReportsService` (8 linhas, zero localStorage) |
| 13 | `src/lib/audit.ts` | `audit_log` em localStorage | ✅ Mantido (sem demo data, usado por `reports.tsx`) |
| 14 | `src/lib/stock.ts` | `stock_items` em localStorage | ✅ `stockService` em `api.ts` |
| 15 | `src/lib/notificationService.ts` | `outbox_messages` em localStorage | ✅ `usePushNotifications` hook (VAPID real) |
| 16 | `src/contexts/AuthContext.tsx` | Fallback "demo-token" | ✅ Removido — só `auth_token` real |

**Verificação:** `grep -rEn "DEMO_USERS|mockLoans|demoData|demoTicket|demoMessages|SEED" Frontend-chatbot/src/` → apenas `SEED=[]` em `userStore.ts` (vazio, necessário para imports).

---

## Plano de execução

5 fases. **Fases A→D são serializadas** (dependência forte). **Fase E (deploy) pode iniciar em paralelo com B** se a infra estiver disponível.

---

### Fase A — Fechar gaps no backend (3-4 dias)

**Objetivo:** todos os 39 endpoints do `lib/api.ts` respondendo 200 (não 404), WS e Push prontos pra consumo seguro.

| # | Tarefa | Arquivo(s) a tocar |
|---|---|---|
| A1 | Criar `GET /tickets/my` como alias de `GET /tickets` (server-side filter por `req.user.sector` + `assignedToId=req.user.id` quando query `?assigned=me`) | [`backend/src/presentation/controllers/tickets/tickets.controller.ts`](../backend/src/presentation/controllers/tickets/tickets.controller.ts) |
| A2 | Criar `GET /tickets/:id/history` — retorna `Message[]` (status change events) unido a `AuditLog` filtrado por `entityType='Ticket'`, ordenado `createdAt asc` | `tickets.controller.ts` + novo `TicketHistoryService` em `backend/src/infrastructure/services/` |
| A3 | Criar `GET /sla/policies` e `GET /sla/dashboard` (lista de `SlaPolicy` e agregados de `SlaTimer` com breach/at-risk counters por sector) | [`backend/src/presentation/controllers/sla/sla.controller.ts`](../backend/src/presentation/controllers/sla/sla.controller.ts) |
| A4 | Criar `GET /push/vapid-public-key` (retorna `{ key: process.env.VAPID_PUBLIC_KEY }`) | [`backend/src/presentation/controllers/push/push.controller.ts`](../backend/src/presentation/controllers/push/push.controller.ts) |
| A5 | Renomear `/ai/reply-suggestions/:ticketId` → `/ai/suggestions/:ticketId` (ou criar alias) | [`backend/src/presentation/controllers/ai/ai.controller.ts`](../backend/src/presentation/controllers/ai/ai.controller.ts) |
| A6 | Decidir convenção `POST /tickets/:id/notes` — opção recomendada: criar alias que internamente chama `ChatService.sendMessage()` com flag `internal=true` (não notifica usuário final) | `tickets.controller.ts` + `chat.service.ts` |
| A7 | **WS hardening**: validar JWT do cookie no `handleConnection()` do gateway; trocar `origin: '*'` por allowlist baseada em `CORS_ORIGINS` env; rejeitar `join` em sala de ticket se `user.sector` não combina com o ticket | [`backend/src/presentation/websockets/events.gateway.ts`](../backend/src/presentation/websockets/events.gateway.ts) |
| A8 | **Rate limiting**: adicionar `@nestjs/throttler` global (60 req/min por IP) + bucket especial em `/auth/login` (5 req/min) | `backend/src/app.module.ts`, `main.ts` |

**Verificação A:**
```bash
cd backend
bun run build && bun run test:e2e
# Smoke manual:
curl -s -X POST http://localhost:3000/auth/login -d '{"email":"...","password":"..."}' -H 'Content-Type: application/json' -c /tmp/cj.txt
for path in /tickets/my /tickets/SOME_ID/history /sla/policies /sla/dashboard /push/vapid-public-key; do
  echo "$path → $(curl -s -b /tmp/cj.txt -o /dev/null -w '%{http_code}' http://localhost:3000$path)"
done
# Todos devem ser 200 (exceto /tickets/SOME_ID/history se ID não existir → 404 ok)
```

---

### Fase B — De-mocking do frontend (4-5 dias)

**Pré-requisito:** Fase A concluída (caso contrário B trava em 404s).

| # | Tarefa | Arquivos |
|---|---|---|
| B1 | Adicionar `socket.io-client@^4.8.3` ao `package.json` do `Frontend-chatbot` (`bun add socket.io-client`) | `Frontend-chatbot/package.json` |
| B2 | Substituir `src/lib/socket.ts` por client real conectando em `VITE_WS_URL`, autenticando via cookie (handshake `withCredentials`), reconnecting on disconnect | `Frontend-chatbot/src/lib/socket.ts` |
| B3 | Trocar `ticketService.getMyTickets()` pra `GET /tickets/my` (ou já o `/tickets` server-side filter — depende da decisão em A1) | `Frontend-chatbot/src/lib/api.ts:62` |
| B4 | Trocar `aiService.getSuggestions(ticketId)` pra path final decidido em A5 | `Frontend-chatbot/src/lib/api.ts` (linha do aiService) |
| B5 | Remover todos os `catch { demoData() }` das 6 rotas listadas no inventário (#4-10 da tabela de mocks) — substituir por `error` state visível no UI | `tickets.$id.tsx`, `chat.$ticketId.tsx`, `purchases.tsx`, `team.tsx`, `engineer.index.tsx` |
| B6 | Deletar `DEMO_USERS` + lógica de fallback demo do `AuthContext.tsx`. Manter `devLogin()` mas gatear com `import.meta.env.DEV` | `Frontend-chatbot/src/contexts/AuthContext.tsx` |
| B7 | Deletar `src/lib/userStore.ts` inteiro. `admin/users.tsx` consome `adminService.getUsers/createUser/updateUser` direto (TanStack Query) | `Frontend-chatbot/src/routes/_authed/admin/users.tsx` |
| B8 | Migrar `src/lib/reports.ts` localStorage → `technicalReportsService` (endpoints REST do módulo `TechnicalReport` que já existe no backend) | `Frontend-chatbot/src/lib/reports.ts`, `src/routes/_authed/reports.tsx` |
| B9 | Migrar `src/lib/stock.ts` localStorage → `stockService` consumindo backend (módulo `Parts/Stock` já existe) | `Frontend-chatbot/src/lib/stock.ts`, `src/routes/_authed/engineer.stock.tsx` |
| B10 | Deletar `src/lib/audit.ts`; substituir uses por `adminService.getLogs()` quando precisar exibir | `Frontend-chatbot/src/lib/audit.ts`, callers |
| B11 | Criar `loansService` em `lib/api.ts` (`GET /tools/loans`, `POST /tools/loans`, `PATCH /tools/loans/:id/return`); remover `mockLoans` de `LoansPanel.tsx` | `Frontend-chatbot/src/lib/api.ts`, `src/components/LoansPanel.tsx`, `src/routes/_authed/loans.tsx` |
| B12 | Introduzir `useMutation` (TanStack Query) onde hoje há POST/PATCH com `try/catch` manual: tickets/notes, status, transfer, purchases approve/reject, admin/users create/update | grep `await.*Service\.(create\|update\|approve\|reject\|transfer)` em `src/routes/_authed/**` |

**Verificação B:**
- Sem `VITE_API_URL`, app deve mostrar erro de auth/conexão na tela de login (não cair em DEMO_USERS).
- Com `VITE_API_URL=http://localhost:3000`, login real funciona, listas carregam, criação/edição persiste, chat real recebe mensagens via WS.
- Buscar `mock|demoData|demoTicket|DEMO_USERS|SEED` em `Frontend-chatbot/src/` — zero hits.

---

### Fase C — PWA real + Web Push (2-3 dias)

| # | Tarefa | Arquivos |
|---|---|---|
| C1 | Adicionar `vite-plugin-pwa` ao `Frontend-chatbot` (workbox runtime caching: `/api/*` NetworkFirst, assets CacheFirst, `/auth/*` NetworkOnly) | `Frontend-chatbot/vite.config.ts`, `package.json` |
| C2 | Gerar ícones 192/256/512 e maskable a partir dos logos por sector (`docs/Logo TI.jpeg`, etc.) — script `scripts/gen-icons.ts` | `Frontend-chatbot/public/icons/`, `scripts/` |
| C3 | Substituir `notificationService.ts` por hook `usePushNotifications`: registra SW → busca VAPID key (`/push/vapid-public-key`) → `pushManager.subscribe()` → `POST /push/subscribe` | `Frontend-chatbot/src/hooks/usePushNotifications.ts`, `src/lib/notificationService.ts` |
| C4 | Tela `/settings` ganha toggle "Receber notificações" que chama o hook | `Frontend-chatbot/src/routes/_authed/settings.tsx` |
| C5 | `InstallPwaPrompt`: garantir que só aparece em mobile + `beforeinstallprompt` capturado; iOS tutorial pra Safari (que não dispara o evento) | `Frontend-chatbot/src/components/InstallPwaPrompt.tsx` |
| C6 | Backend: ao criar ticket / mudar status / receber mensagem, disparar push pra subscribers do sector via `PushService.sendToSector()` ([`backend/src/infrastructure/services/push.service.ts`](../backend/src/infrastructure/services/push.service.ts)) | hooks dos use cases / services |

**Verificação C:**
- Instalar PWA no Chrome mobile (DevTools → Application → Install).
- Aceitar notificações; criar ticket via outra sessão → push chega offline.
- `chrome://serviceworker-internals` mostra SW ativo, cache populado.

---

### Fase D — Hardening + smoke E2E (2 dias)

| # | Tarefa | Arquivo/Comando |
|---|---|---|
| D1 | Habilitar `helmet` + CSP estrita no NestJS (já tem helmet, revisar directives) e configurar `X-Frame-Options`, `Referrer-Policy` | `backend/src/main.ts` |
| D2 | Auditoria: `npm audit --production` em backend + frontend; corrigir CVEs high+critical | terminal |
| D3 | Playwright E2E suite (existe parcial em [`backend/e2e/`](../backend/e2e/)): 3 fluxos chave — login → criar ticket → comentar; admin cria usuário; PWA install + push | `backend/e2e/`, `Frontend-chatbot/e2e/` (novo) |
| D4 | Logs estruturados: garantir que toda 5xx no backend tem trace ID; frontend manda `X-Request-ID` no axios interceptor | `backend/src/middleware/`, `Frontend-chatbot/src/lib/api.ts` |
| D5 | Validar inputs server-side em endpoints novos (A1-A6) com `class-validator` DTOs | controllers da Fase A |

**Verificação D:**
- `npm audit --production` zero high/critical.
- Suite Playwright passa.
- Subir staging e rodar smoke manual (login real, criar ticket, comentar, fechar, ver SLA timer).

---

### Fase E — Implantação em produção (3 dias)

> **Objetivo:** stack rodando em https://ti.helpdeskmsm.com.br, https://eletrica.helpdeskmsm.com.br, https://compras.helpdeskmsm.com.br, https://api.helpdeskmsm.com.br com cert wildcard, sem downtime visível.

#### E1 — Pré-requisitos no host
- Servidor Linux com Docker + Docker Compose plugin (mínimo 4 GB RAM, 2 vCPU).
- DNS apontando `*.helpdeskmsm.com.br` pra IP do host (record A wildcard).
- Portas 80 e 443 abertas na firewall.
- Domínio com acesso DNS pra desafio DNS-01 do Let's Encrypt (ou usar HTTP-01 em vhost default).

#### E2 — Arquivos a criar (NÃO TRACKED hoje)
- **`nginx/sites-enabled/helpdeskmsm.conf`** — 4 vhosts (`ti.`, `eletrica.`, `compras.` proxypass pra frontend nginx container; `api.` proxypass pra backend NestJS). HTTP→HTTPS redirect. HSTS. gzip. WebSocket upgrade headers pra `/socket.io/`.
- **`nginx/Dockerfile`** — `nginx:alpine` + cópia de `dist/` do `Frontend-chatbot` + `sites-enabled/`.
- **`Frontend-chatbot/Dockerfile`** (multi-stage) — `bun install && bun run build` → copia `dist/` pra image final do nginx.
- **`scripts/gen-wildcard-cert.sh`** — `certbot certonly --manual --preferred-challenges dns -d "*.helpdeskmsm.com.br" -d "helpdeskmsm.com.br"`.

#### E3 — `.env` de produção (template)
```bash
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://helpdesk:STRONG_PASS@postgres:5432/helpdesk
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://helpdesk:STRONG_PASS@rabbitmq:5672

JWT_SECRET=$(openssl rand -hex 64)
JWT_EXPIRES_IN=8h
COOKIE_DOMAIN=.helpdeskmsm.com.br
COOKIE_SECURE=true
CORS_ORIGINS=https://ti.helpdeskmsm.com.br,https://eletrica.helpdeskmsm.com.br,https://compras.helpdeskmsm.com.br

# Hermes
HERMES_API_KEY=$(openssl rand -hex 32)
MINIMAX_API_KEY=...
OPENROUTER_API_KEY=...
WHATSAPP_MODE=baileys

# Push
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public)
VAPID_PRIVATE_KEY=$(npx web-push generate-vapid-keys | grep Private)
VAPID_SUBJECT=mailto:dev@helpdeskmsm.com.br

# Frontend (build time)
VITE_API_URL=https://api.helpdeskmsm.com.br
VITE_WS_URL=wss://api.helpdeskmsm.com.br
```

#### E4 — Sequência de deploy
```bash
# 1. clonar no host
ssh deploy@server
git clone https://github.com/Berg-2019/Chatbot-suporte-ti.git
cd Chatbot-suporte-ti
git submodule update --init --recursive
git clone https://github.com/Berg-2019/Frontend-chatbot.git

# 2. config
cp .env.example .env && vim .env   # preencher com os valores acima

# 3. cert wildcard (uma vez)
sudo ./scripts/gen-wildcard-cert.sh
# copiar /etc/letsencrypt/live/helpdeskmsm.com.br/*.pem pra nginx/certs/

# 4. build + up
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d postgres redis rabbitmq
docker compose -f docker-compose.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.yml up -d backend hermes hermes-tools nginx

# 5. pareamento WhatsApp (uma vez)
docker logs -f helpdesk_hermes   # escanear QR
```

#### E5 — Smoke pós-deploy
```bash
# DNS + cert
dig +short ti.helpdeskmsm.com.br
curl -sI https://ti.helpdeskmsm.com.br | grep -E 'HTTP|strict-transport-security'

# Backend health
curl -s https://api.helpdeskmsm.com.br/health

# SSO entre subdomínios
curl -c /tmp/cj.txt -X POST https://api.helpdeskmsm.com.br/auth/login -d '{"email":"...","password":"..."}' -H 'Content-Type: application/json'
curl -b /tmp/cj.txt https://api.helpdeskmsm.com.br/auth/me   # 200
# cookie Domain=.helpdeskmsm.com.br deve ser válido nos 3 subdomínios

# WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  https://api.helpdeskmsm.com.br/socket.io/?EIO=4   # 101 Switching Protocols

# WhatsApp
docker exec helpdesk_hermes node -e "console.log(require('./scripts/whatsapp-bridge/state.js').connectionState)"   # connected
```

#### E6 — Backup + rollback
- Backup automático Postgres diário via `pg_dump` (cron no host); reter 14 dias.
- Tag git por release: `git tag -a v1.0.0 -m "..."` antes de cada `docker compose up`.
- Rollback: `git checkout <tag>` + `docker compose up -d --build` (banco roda forward-only — preparar `prisma migrate resolve` se precisar reverter migration).

#### E7 — Monitoramento mínimo
- `docker logs --tail=200` em cron a cada hora → grep `ERROR|WARN` → alerta email.
- Healthcheck no docker-compose pra cada serviço (já existe em `docker-compose.yml`).
- Página `/status` no nginx que agrega `/health` dos serviços.

---

## Arquivos críticos a modificar / criar

### Backend
- [backend/src/presentation/controllers/tickets/tickets.controller.ts](../backend/src/presentation/controllers/tickets/tickets.controller.ts) — A1, A2, A6
- [backend/src/presentation/controllers/sla/sla.controller.ts](../backend/src/presentation/controllers/sla/sla.controller.ts) — A3
- [backend/src/presentation/controllers/push/push.controller.ts](../backend/src/presentation/controllers/push/push.controller.ts) — A4
- [backend/src/presentation/controllers/ai/ai.controller.ts](../backend/src/presentation/controllers/ai/ai.controller.ts) — A5
- [backend/src/presentation/websockets/events.gateway.ts](../backend/src/presentation/websockets/events.gateway.ts) — A7
- `backend/src/app.module.ts`, [backend/src/main.ts](../backend/src/main.ts) — A8, D1

### Frontend
- `Frontend-chatbot/src/lib/api.ts` — B3, B4, B11
- `Frontend-chatbot/src/lib/socket.ts` — B2
- `Frontend-chatbot/src/contexts/AuthContext.tsx` — B6
- `Frontend-chatbot/src/lib/{userStore,reports,audit,stock,notificationService}.ts` — B7-B10, B14, C3
- `Frontend-chatbot/src/routes/_authed/{tickets.$id,chat.$ticketId,purchases,team,engineer.index}.tsx` — B5
- `Frontend-chatbot/src/components/LoansPanel.tsx` — B11
- `Frontend-chatbot/vite.config.ts`, `Frontend-chatbot/public/icons/` — C1, C2
- `Frontend-chatbot/src/hooks/usePushNotifications.ts` (novo) — C3

### Infra (a criar)
- `nginx/sites-enabled/helpdeskmsm.conf`
- `nginx/Dockerfile`
- `Frontend-chatbot/Dockerfile`
- `scripts/gen-wildcard-cert.sh`
- `scripts/gen-icons.ts`

---

## Verificação end-to-end (definição de "pronto")

Stack está integrada quando todos os checks passam:

1. **Sem mocks:** `grep -rEn "DEMO_USERS|mockLoans|demoData|demoTicket|demoMessages|SEED|fakeUsers" Frontend-chatbot/src/` retorna **zero linhas**. ✅
2. **Sem localStorage de domínio:** `grep -rn "localStorage" Frontend-chatbot/src/lib/` mostra apenas `auth_token`, `user_data` (cache do `useAuth`) e `pwa_dismiss_key`. ✅
3. **Endpoints:** todos os 39 endpoints do `lib/api.ts` retornam 200/4xx esperado — nenhum 404. ✅
4. **WebSocket autenticado:** JWT cookie auth + CORS allowlist + sector guard. ✅
5. **PWA funcional:** vite-plugin-pwa + workbox + offline.html + ícones setoriais + manifest.webmanifest. ✅
6. **Push funcional:** VAPID subscription via hook `usePushNotifications`. ✅
7. **Playwright E2E** (Fase D3): 3 fluxos em `backend/e2e/` (TI ticket, ELECTRIC checklist, COMPRAS approve + SSO). ✅
8. **Trace ID:** `X-Request-ID` em toda response via `TraceIdInterceptor + AsyncLocalStorage`. ✅
9. ⏳ **Smoke produção (E5):** pendente — requer servidor, DNS wildcard, VAPID keys, docker-compose.prod
10. ⏳ **Lighthouse Performance** ≥ 80: pendente — smoke test em produção

---

## Cronograma estimado

| Fase | Duração | Marco | Status |
|---|---|---|---|
| A — Backend gaps | 3-4 dias | 5 endpoints novos, WS hardened, rate limit | ✅ Completa |
| B — De-mocking | 4-5 dias | Zero fallbacks fake, useMutation onde precisa | ✅ Completa |
| C — PWA + Push | 2-3 dias | App instalável, push funcionando | ✅ Completa |
| D — Hardening + E2E | 2 dias | Playwright verde, audit clean | ✅ Completa |
| E — Implantação | 3 dias (paralelo) | Stack rodando em produção | ⏳ Aguardando |
| **Total serializado** | **11-14 dias** | **Fases A-D completas** | ✅ |

Cronograma assume 1 dev em paralelo com Hermes Agent já operacional. Pode acelerar com 2 devs (front + back em paralelo a partir do final de A).

---

## Dependências externas

| Recurso | Onde | Risco se faltar |
|---|---|---|
| Wildcard DNS `*.helpdeskmsm.com.br` | provedor DNS | E2/E5 — sem cert válido nem SSO |
| MiniMax API key (válida) | dashboard MiniMax | Hermes não responde — fallback OpenRouter/Ollama mitiga |
| VAPID keypair | gerado uma vez | C — sem push |
| `socket.io-client@4.x` | npm | B — sem realtime, só polling |
| Servidor Linux + Docker | infra | E — sem deploy |

---

## Notas pra retomar depois

- Backups remotos do trabalho anterior estão em `Berg-2019/profile-driven-app` branches `archive/feature-chatbot-upgrade-pre-reset-2026-05-11` e `archive/wip-clone-interno-pre-reset-2026-05-11` — consultar se algum trecho do rewire passado for útil.
- Submódulo `hermes-agent` aponta pra fork `Berg-2019/hermes-agent` (HEAD `1b46ff7`), com 3 commits custom (cleanup skills, bridge.js Docker, helpdesk-conversation skill). Não rebasear sobre upstream NousResearch.
- Manter este plano sincronizado com [IMPLEMENTATION_PLAN_V3.md](../IMPLEMENTATION_PLAN_V3.md) (este é o detalhamento operacional da §6 do plano-mãe).
