# Checklist de Implementação V3

> Snapshot de progresso em **2026-05-10** baseado em auditoria QA + smoke test E2E real contra `IMPLEMENTATION_PLAN_V3.md`.
> Marcar `[x]` quando concluir. Atualizar este arquivo a cada commit relevante.

**Estado atual:** Fases 0-5 ✅ completas · Fase 6.13 LGPD 🔄 Sprint 1+2 ✅ · **Integração Lovable** ✅ Fases 1+2.2+3+5 concluídas · **Auditoria cross-FE↔BE** realizada (2026-05-10)
**Branch:** `feature/chatbot-upgrade` · 170+ commits ahead de `main`
**Último marco:** Auditoria completa frontend↔backend — 6 endpoints quebrados identificados, ~150 endpoints sem frontend, código morto mapeado. Ver [`docs/FRONTEND_BACKEND_AUDIT.md`](docs/FRONTEND_BACKEND_AUDIT.md).

---

## 🆕 Integração Lovable (2026-05-10) — pós-merge `origin/main` no `profile-driven-app`

> Resposta ao push de 49 commits da Lovable em `profile-driven-app`, que trouxeram features novas 100% mockadas (`reportStore` em localStorage, `DEMO_USERS` hardcoded, `mockLoans`, fallbacks `catch{demoData}`). Plano completo em [INTEGRATION_PLAN_LOVABLE.md](INTEGRATION_PLAN_LOVABLE.md).

### ✅ Fase 1 — Backend: módulo `technical-reports` (laudos NR-10/NR-35)

- [x] Schema Prisma: 4 models + 2 enums (`TechnicalReport`, `TechnicalReportMedia/Annotation/Signature`, `TechnicalReportStatus`, `SignerRole`) + back-relations em `User`/`Ticket`
- [x] Migration `20260510120000_add_technical_reports/migration.sql` (4 tabelas + índices + FKs)
- [x] DTOs com `class-validator` em `dto/index.ts` (7 DTOs: Create/Update/Query/Status/Annotation/Sign)
- [x] `TechnicalReportsService` — CRUD + auto-numeração `RT-YYYY-NNNN` + transições de status validadas (`DRAFT→SUBMITTED→APPROVED|REWORK`, `REWORK→SUBMITTED`)
- [x] `TechnicalReportsController` — 13 endpoints (CRUD + media upload/serve/delete + annotations + sign + signature serve)
- [x] `TechnicalReportsModule` com Multer (`./uploads/reports/`, 25 MB, image/video) + signature dir
- [x] Wire em `app.module.ts` + diretório `uploads/reports/signatures/` criado
- [x] Backend `tsc --noEmit` exit 0

### ✅ Fase 2.2 — Push notifications: pipeline real

- [x] `web-push@^3.6.7` + `@types/web-push` instalados
- [x] `PushService.onModuleInit()` configura VAPID via env (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`)
- [x] `sendToUser(userId, payload)` envia real via `webpush.sendNotification()`
- [x] `sendToSector(sector, payload)` — broadcast por sector
- [x] Auto-cleanup de subscriptions stale (404/410 → `prisma.deleteMany`)
- [x] `AlertService` injeta `PushService` — `sentViaPush=true` só se `result.sent > 0`
- [x] `services.module.ts` importa `PushModule`
- [x] `env.validation.ts` declara `VAPID_*` (opcionais — se ausentes, push fica off com warning)
- [x] 3 call-sites de `pushService.sendToUser` atualizados pra nova assinatura (`tickets.service`, `purchase-requests.service` ×2)

### ✅ Fase 3 — Frontend: remoção de mocks + wire-up backend

- [x] `lib/api.ts` — adicionados `technicalReportsService` (12 métodos), `loansService` (3 métodos)
- [x] `lib/reports.ts` reescrito (192 → 8 linhas) — só re-exporta tipos + `statusLabels`. **Zero localStorage.**
- [x] `routes/_authed/reports.tsx` — TanStack Query (`useQuery` + `useMutation`), upload via FormData, assinatura via blob → `/sign`
- [x] `components/LoansPanel.tsx` — `mockLoans` removido, `useQuery(['loans','active'], loansService.list)`
- [x] Fallbacks `catch{demoData}` removidos: `tickets.index`, `chat.index`, `chat.$ticketId`, `tickets.$id`, `purchases`
- [x] `AuthContext.tsx` — `DEMO_USERS`, `devLogin`, fallback localStorage **gateados por `import.meta.env.DEV`** (tree-shaken em prod)
- [x] `routes/login.tsx` — caixa demo + link "manutenção" só em DEV
- [x] `routes/dev.tsx` + `dev-login.tsx` — redirect `/` em prod
- [x] `routes/__root.tsx` — removido `SECTOR_MANIFESTS`/`SECTOR_ICONS` (código morto) + meta tags branding "Lovable App"
- [x] Bug pré-existente corrigido: `settings.tsx` não importava `usePushNotifications` nem `toast`
- [x] Frontend `tsc --noEmit` exit 0

### ✅ Fase 3.11 — PWA único + sector via JWT (decisão 2026-05-10)

> Anula a estratégia de "1 manifest por subdomínio" do plano V3. **Tema/abas/dados vêm do JWT, não do host.** Os 3 subdomínios continuam servindo o mesmo build por conveniência de URL/SSO. Justificativa: simplifica instalação (1 PWA no celular do técnico), reduz complexidade de assets/manifests, mantém SSO inalterado.

- [x] `__root.tsx` — `AuthProvider` movido para fora de `ThemeProvider`
- [x] `ThemeContext` — sector lido de `useAuth().sector`; `detectSectorFromHost()` vira fallback pré-login apenas
- [x] `_authed.tsx` — removido redirect entre subdomínios (`SECTOR_DOMAINS` map e bloco `if (userSector !== hostSector && PROD)`)
- [x] `SectorSwitcher` — `if (!import.meta.env.DEV) return null` (em prod retorna nada; setor é imutável)
- [x] `settings.tsx` — gate `(isAdmin || isDev)` removido (componente se auto-protege)
- [x] `CLAUDE.md` atualizado em 4 pontos (cabeçalho, diagrama ASCII, snippet de exemplo, Quick Reference #5)
- [x] `INTEGRATION_PLAN_LOVABLE.md` — Fase 4 (3 manifests) marcada como **cancelada**

### ✅ Fase 5 — Hardening produção (frontend)

- [x] `lib/api.ts` — falha em build de prod sem `VITE_API_URL` (`throw new Error` ruidoso no top-level)
- [x] SW dev-disabled confirmado (vite-plugin-pwa default `devOptions.enabled: false`)
- [x] `lib/compressImage.ts` — util compartilhado `compressImageIfNeeded`/`compressImagesIfNeeded` (`maxSizeMB: 0.5, maxWidthOrHeight: 1920`)
- [x] Compressão aplicada em `reports.tsx` (mídia de relatórios) e `chat.$ticketId.tsx` (image kind)
- [x] `tickets.new.tsx` mantém compressão local pré-existente

### ⏭️ Fases puladas / canceladas

- ⏭️ Fase 2.1 — `PATCH /users/me/preferences` para `SectorSwitcher` persistir → **descartada** (PWA único + switcher só em DEV)
- ❌ Fase 4 — 3 manifests por subdomínio → **cancelada** (decisão PWA único)
- ⏭️ Fase 6 — E2E Playwright → adiada para após smoke manual

### 📋 Pré-requisitos para deploy

- [ ] Aplicar migration: `cd backend && npx prisma migrate deploy`
- [ ] Gerar VAPID keys (`npx web-push generate-vapid-keys`) e configurar `.env`
- [ ] Smoke manual: login → criar ticket → criar relatório técnico → upload foto comprimida → assinar → verificar imagem renderizando do backend
- [ ] Smoke push: subscrever PWA → trigger alerta SLA → confirmar notificação chegando

---

## ✅ Fase 0 — Estabilização (COMPLETA)

- [x] Snapshot antes do V3 — commit `f14f609`
- [x] Fix IDOR em tickets.controller.ts — commit `6cf25d4`
- [x] JWT com `sector`+`role` em auth.service.ts — commit `6cf25d4`
- [x] `Sector` enum em schema.prisma + migration — commit `53f9b3a`
- [x] Setup Jest + spec (TicketsService) — commit `932b1ae`
- [x] Tests unitários: 69/69 passando (`npm run test`)
- [x] package.json script `test` corrigido para usar `jest.config.js`
- [x] `AGENTS.md` criado com armadilhas e padrões — commit `611dd34`
- [ ] **Rebase em main** ← antes do merge final (agendado)

---

## ✅ Fase 1 — Remover bot + GLPI (COMPLETA)

### Bot legado ✅
- [x] `bot/src/` deletado — commit `a41ef9a`
- [x] `BotModule` removido — commit `8953b26`
- [x] Service `bot:` removido de `docker-compose.dev.yml` — commit `da23bec`
- [x] Service `bot:` removido de `docker-compose.yml` (prod) — commit `e1f01a2`
- [x] Pasta `bot/` removida do filesystem
- [x] `bot-tickets.controller.ts` deletado — commit `ffc61f5`

### GLPI ✅ (refs GLPI = 0 no grep backend/src)
- [x] `glpi.service.ts` deletado — commit `a41ef9a`
- [x] `glpi-sync.service.ts` deletado — commit `a41ef9a`
- [x] GLPI endpoints em `users.controller.ts` removidos — commit `b774da8`
- [x] Service `glpi:` removido de `docker-compose.yml` (prod) — commit `e1f01a2`
- [x] Service `glpi:` e `mysql:` removidos de `docker-compose.dev.yml` — commit `da23bec`
- [x] Env vars `GLPI_*` removidas de env.validation — commit `da23bec`
- [x] `grep -ri "glpi" backend/src/` retorna vazio ✅

---

## ✅ Fase 2 — CMDB nativo (COMPLETA ~95%)

### Schema Prisma ✅
- [x] Model `Asset` — commit `3bf75fe`
- [x] Enum `AssetCategory` — commit `3bf75fe`
- [x] Enum `AssetLifecycle` — commit `3bf75fe`
- [x] Model `AssetAssignment` — commit `3bf75fe`
- [x] Model `License` + `LicenseType` — commit `3bf75fe`
- [x] Model `LicenseAssignment` — commit `3bf75fe`
- [x] `affectedAssetId String?` em `Ticket` — commit `3bf75fe`
- [x] `PushSubscription` model + migration — commit `4960dda`

### Backend ✅
- [x] Pasta `backend/src/presentation/controllers/assets/` completa
- [x] `assets.controller.ts` — CRUD + assign + return + scan
- [x] `assets.service.ts` + spec (17 testes)
- [x] `assets.module.ts`
- [x] `assets/dto/index.ts` com `CreateAssetDto`, `UpdateAssetDto`, `AssignAssetDto` — commit `9323a1f`
- [x] `licenses.controller.ts`, `licenses.service.ts` + spec (13 testes)
- [x] Pasta `backend/src/application/use-cases/assets/` — commit `9323a1f`
  - [x] `assign-asset.uc.ts` + spec (4 testes)
  - [x] `return-asset.uc.ts` + spec (4 testes)

### Migração de dados
- [x] Script `prisma/seeds/migrate-printers-to-assets.ts` (idempotente, dry-run) — commit `9323a1f`
- [ ] Printer model mantido por 1 sprint como sombra

### Tests ✅
- [x] `assets.service.spec.ts` — 17 testes
- [x] `licenses.service.spec.ts` — 13 testes
- [x] `assign-asset.uc.spec.ts` — 4 testes
- [x] `return-asset.uc.spec.ts` — 4 testes
- [x] Total Fase 2: 38 novos testes

### Critério de done
- [x] Cadastrar computador → atribuir a usuário → abrir ticket linkado → ver histórico

---

## ✅ Fase 3 — SLA Engine (COMPLETA)

### Schema ✅
- [x] Model `SlaPolicy` — commit `b8a7d76`
- [x] Model `BusinessHours` — commit `b8a7d76`
- [x] Model `SlaTimer` 1:1 com Ticket — commit `b8a7d76`
- [x] Model `EscalationRule` + `EscalationTrigger` enum — commit `b8a7d76`

### Backend ✅
- [x] `sla-calculator.service.ts` (timezone + business hours) — commit `b8a7d76`
- [x] Hook em `TicketsService.create()` → cria `SlaTimer` — commit `85a4bab`
- [x] Hook em `TicketsService.updateStatus()` → marca `responseMetAt`/`pause`/`resume` — commit `85a4bab`
- [x] `SlaBreachJob` (cron EVERY_MINUTE) + EscalationRules — commit `cc2a93f`
  - [x] Detecta breach iminente (20min threshold)
  - [x] Detecta breach efetivo
  - [x] Aplica `EscalationRule` (NOTIFY_MANAGER, REASSIGN, ESCALATE_TO_L2/L3)
  - [x] Emite via AlertService + RabbitMQ
- [x] Endpoints `GET/POST /sla/policies`, `GET /sla/dashboard`, `GET /sla/breaches`
- [x] `SlaSeedService` — 12 SlaPolicy padrão (3 sectors × 4 prioridades) — commit `b8a7d76`

### Tests ✅
- [x] `sla.service.spec.ts` — 16 testes

---

## ✅ Fase 4 — PurchaseRequest CRUD (COMPLETA ~95%)

### Schema ✅
- [x] `PURCHASED` e `DELIVERED` no enum `PurchaseRequestStatus`
- [x] `requestedById` em `PurchaseRequest`
- [x] `ticketId String?` (relação opcional com Ticket)
- [x] `purchasedById`, `purchasedAt`, `deliveredById`, `deliveredAt` adicionados — commit `416571d`
- [x] Migration

### Backend ✅
- [x] `purchase-requests.controller.ts` + `purchase-requests.service.ts` + spec
- [x] `purchase-requests.module.ts`
- [x] `purchase-requests.dto.ts` com class-validator
- [x] `POST /purchase-requests`
- [x] `GET /purchase-requests`
- [x] `PATCH /:id/approve` — `@Roles(ADMIN_COMPRAS)`
- [x] `PATCH /:id/reject` — `@Roles(ADMIN_COMPRAS)`, `rejectionReason` obrigatório
- [x] `PATCH /:id/mark-purchased` — `@Roles(ADMIN_COMPRAS)`
- [x] `PATCH /:id/mark-delivered`
- [x] Eventos RabbitMQ ao mudar status
- [x] Push notifications em approve/reject — commit `cc2a93f`

---

## ✅ Fase 5 — Hermes orchestration (COMPLETA)

### Skill principal ✅
- [x] `hermes-integration/skills/helpdesk-conversation/SKILL.md` (orquestrador)
- [x] 5 skills atômicas: helpdesk-faq, helpdesk-create-ticket, helpdesk-check-status, helpdesk-reserve-equipment, helpdesk-escalate

### Idempotência ✅
- [x] `RedisService.tryMarkMessageProcessed()` com TTL 24h — redis.service.ts:191
- [x] Dedup por `wa_message_id` em messages.service.ts:210-218

### Resiliência ✅
- [x] Circuit breaker opossum em server.js (todas as 10 tools) — commit `6b1cfa8`
- [x] `POST /tools/auto-resolve-attempt` no bridge
- [x] Hermes responde fallback gracioso quando backend cai

### WhatsApp infra ✅
- [x] `scripts/hermes-reconnect.sh` (backup, restore, force-qr, status)
- [x] Backup diário do volume `hermes_whatsapp_session` via cron
- [x] Volume `hermes_whatsapp_session` configurado no docker-compose.dev.yml

### Captain como tool ✅
- [x] Endpoint `POST /captain/assist` no backend
- [x] `auto_resolve_attempt` tool no hermes-tools
- [x] Confidence threshold ≥ 0.85 para auto-resolve

---

## 🔄 Fase 6 — Frontend + PWA mobile (EM PROGRESSO)

### 6.1 — Dockerizar e conectar
- [x] `profile-driven-app` clonado em `profile-driven-app/` (raiz do projeto) ✅ (2026-05-04)
- [x] `nginx/sites-enabled/helpdeskmsm.conf` com 4 server blocks — commit `6b1cfa8`
- [x] Service `frontend` em docker-compose.dev.yml (comentado, aguardando build)
- [x] CORS no backend aceita 3 origens com `credentials: true` ✅ (app.module.ts verificado)
- [x] AuthContext com cookie httpOnly ✅ (Fase 0)

### 6.2 — Multi-tenancy via host + role
- [x] `ThemeContext.tsx` lê sector via host com `detectSectorFromHost()`
- [x] CSS vars por setor aplicadas ✅
- [x] Redirect para subdomínio correto quando `user.sector ≠ host` em produção (`_authed.tsx`) — commit `88840c6`
- [x] Route gates `beforeLoad` em `_authed/` ✅ — commit `88840c6`

### 6.3 — Features de domínio
- [x] `_authed/tickets/` (list + detail + create com foto) ✅
- [x] `_authed/assets/` (list + detail + assign + scan QR) ✅
- [x] `_authed/purchase-requests/` (list + detail + approve/reject) ✅
- [x] `_authed/knowledge/` (KB + FAQ) ✅
- [x] `_authed/safety/` (NR-10/35 checklists) ✅ — commit `b6a121c` (chinês→pt-BR)
- [x] `_authed/admin/sla-policies/` ✅
- [x] WebSocket client + invalidate queries ✅
- [x] Badge de SLA (verde/amarelo/vermelho) em ticket ✅

### 6.4 — PWA mobile-first
- [x] `public/manifest-ti.webmanifest` ✅ (3 setores)
- [x] `public/manifest-electric.webmanifest`
- [x] `public/manifest-compras.webmanifest`
- [x] `vite-plugin-pwa` com `autoUpdate` + Workbox runtimeCaching
- [x] `public/offline.html` ✅
- [x] `useServiceWorkerUpdate.ts` hook (toast "Nova versão disponível") ✅ — commit `f2469ec`
- [x] Câmera no anexo de ticket (`capture="environment"`) ✅ — `tickets.new.tsx`
- [x] Compressão client-side (`browser-image-compression`) ✅
- [x] QR scanner em `/assets/scan` (`barcode-detector` + torch) ✅ — `assets.scan.tsx`
- [x] `usePushNotifications.ts` hook com VAPID subscription ✅
- [x] UI de toggle push em settings ✅ (2026-05-04)
- [ ] Background sync em POSTs (offline ticket creation)
- [x] Ícones PWA por sector ✅ — logos de `docs/` copiados para `public/icons/{ti,electric,compras}/`

### Push Notifications ✅ (backend)
- [x] `PushSubscription` model + migration — commit `4960dda`
- [x] `POST /push/subscribe` e `DELETE /push/unsubscribe` — commit `ac3a07f`
- [x] `PushService.sendToUser()` — commit `cc2a93f`
- [x] Dispara em: ticket atribuído (`cc2a93f`), PR aprovado/rejeitado (`cc2a93f`)

### 6.5 — Dev local
- [x] Scripts `bun run dev:ti / dev:electric / dev:compras / dev:all` (via profile-driven-app, fora do repo)
- [ ] `docker-compose.staging.yml` para smoke test multi-subdomínio

### 6.6 — QA
- [ ] Tests E2E Playwright (3 fluxos: TI cria ticket, ELECTRIC checklist, COMPRAS aprova) — commit `0d1f880`
- [ ] Lighthouse mobile: Performance ≥ 85, PWA ≥ 95, A11y ≥ 95
- [ ] Teste de campo: tablet no prédio MSM, instalar PWA, escanear QR

### 6.7 — Padronização de espaçamento e layout (UI polish)
> **Sintoma observado (2026-05-03):** dashboard `/tickets` com header colado no topo do viewport (sem `safe-top`), cards sem respiro entre colunas em viewport ≥ md, e sobreposição com `BottomNav` em algumas listas longas. Vale para os 3 fronts (TI/ELECTRIC/COMPRAS) e em todas as abas (`tickets`, `assets`, `purchases`, `knowledge`, `safety`, `admin`).

- [x] Definir tokens de espaçamento padrão em `src/styles.css` (via `@theme` Tailwind 4):
  - `--page-padding-x`, `--page-padding-y`, `--section-gap`, `--card-gap`
- [x] Criar layout-wrapper único usado por todas as rotas `_authed/*`:
  - Padding `safe-top` + `safe-bottom` (já há helpers, aplicar consistentemente)
  - `pb-24` mínimo pra não sobrepor com `BottomNav` (h-20 + folga)
  - `max-w-screen-xl` + grid responsivo `md:grid-cols-2` com `gap-6`
- [x] Auditar e corrigir cada rota em `src/routes/_authed/`:
  - [x] `tickets/index.tsx` (caso do screenshot)
  - [x] `tickets/$id.tsx` e `tickets/new.tsx`
  - [x] `assets/index.tsx`, `assets/$id.tsx`, `assets/scan.tsx`
  - [x] `purchases/index.tsx`, `purchases/$id.tsx`, `purchases/new.tsx`
  - [x] `knowledge/`, `safety/`, `admin/`, `settings/`
- [x] Validar nos 3 hosts (5173/5174/5175) e em viewport mobile (375px), tablet (768px) e desktop (≥1280px)
- [x] Nenhuma sobreposição com `BottomNav` em scroll até o fim de listas longas
- [x] Header não cola no notch (testar em iOS Safari simulado)

### 6.8 — Correções de integração API ↔ Frontend
> **Sintomas observados (2026-05-03, console em `localhost:5173`):**
> - `GET /api/tickets/my?sector=TI` → **404 Not Found** ([api.ts:63](../profile-driven-app/src/lib/api.ts#L63)). Backend não expõe `GET /tickets/my` — o endpoint correto é `GET /tickets` ([tickets.controller.ts:40](backend/src/presentation/controllers/tickets/tickets.controller.ts#L40)), que já filtra por `req.user.sector` no JWT (passar `sector` como query param é ignorado).
> - Mesmo com 404, a tela mostra dados — porque cada rota tem **fallback demo** com mocks hardcoded ([ex.: tickets.index.tsx:45-78](../profile-driven-app/src/routes/_authed/tickets.index.tsx#L45-L78)). Mascara bugs reais e cria a falsa impressão de que está integrado.

- [x] **Corrigir `ticketService.getMyTickets`** em [api.ts:62-63](../profile-driven-app/src/lib/api.ts#L62-L63): trocar `/tickets/my` por `/tickets` (sector vem do JWT, não passar como query).
- [x] **Auditar paridade de endpoints** entre backend e frontend (tabela em [§ Endpoints do CLAUDE.md](CLAUDE.md)). Verificar caso a caso:
  - tickets, assets, purchase-requests, knowledge, sla, push, admin/users
- [x] **Padronizar shape de respostas paginadas** (2026-05-04, opção b). Interceptor de resposta em [api.ts](../profile-driven-app/src/lib/api.ts) nivela quatro endpoints envelopados pra `Array<T>`, preservando `total` em `x-total-count`:
  - `GET /tickets` (`tickets`), `GET /purchase-requests` (`items`), `GET /knowledge/articles` (`articles`), `GET /assets` (`data`)
  - Componentes voltam a fazer `res.data as T[]` direto, sem desempacotar manualmente.
  - Decisão futura (opção a — backend devolve array nativo): segue como tarefa de cleanup no backend, não-bloqueante.
- [x] **Remover fallbacks demo** de todas as rotas com `} catch {` que retornam mocks (13 arquivos identificados):
  - `tickets.index.tsx`, `tickets.$id.tsx`, `tickets.new.tsx`
  - `assets.tsx`, `assets.scan.tsx`
  - `purchases.tsx`, `purchases.new.tsx`
  - `chat/index.tsx`, `chat/$ticketId.tsx`, `team.tsx`
  - `knowledge.tsx`, `admin/users.tsx`, `admin/sla-policies.tsx`
  - Substituir por estado de erro real (`isError` do TanStack Query) com toast/empty state.
- [x] Opcional: gatear demo atrás de `import.meta.env.VITE_DEMO=1` (não ligado por padrão), pra ainda permitir preview offline sem mascarar bugs em dev normal.
- [x] Ignorar erros de extensão `Uncaught Error: Extension context invalidated` (origem `content.js` — extensão do browser, não da app).

### 6.9 — Chat de Ticket (bugs de contrato backend↔frontend)
> **Sintoma (2026-05-04):** ao clicar em "Conversar" num ticket, a tela `/chat/$ticketId` carrega mas mensagens renderizam no lado errado, header mostra "Chat" genérico, "Encerrar"/"Transferir" silenciam erros. Causa: 4 contratos quebrados convergindo.

- [x] Bug 1 — normalizar `getMessages` payload: `direction`+`sender:{role}` → `sender: 'user'|'technician'|'bot'` + `senderName` flat ([chat.service.ts:44-52](backend/src/presentation/controllers/chat/chat.service.ts#L44-L52)) — commit `05d4134`
- [x] Bug 2 — criar `GET /ai/reply-suggestions/:ticketId` (atual `/ai/suggestions` retorna analytics, não sugestões de resposta) ([adaptive-ai.controller.ts:63](backend/src/presentation/controllers/adaptive-ai/adaptive-ai.controller.ts#L63)) — commit `05d4134`
- [x] Bug 3 — frontend usa **verbo errado** (`api.patch` vs backend `@Put(':id/status')`). Validado via curl 2026-05-04: PATCH=404, PUT 'CLOSED'=200, POST /close=201. Trocar `api.patch` → `api.put` (ou usar endpoint dedicado `POST /tickets/:id/close`). Status sempre em UPPERCASE. Remover `catch {}` silenciosos — commit `05d4134`
- [x] Bug 4 — endpoint `POST /tickets/:id/transfer` aceita `userId` (UUID), frontend mandava `"N2"` (string) — botão Transferir removido — commit `05d4134`
- [x] Bug 5 — empty state no chat quando não há mensagens — commit `05d4134`

### 6.10 — Tela de Chat de Mensagens (build-out completo)
> **Sintoma (2026-05-04):** após corrigir os 5 bugs, o usuário relatou "acredito que não exista uma tela de chat" — porque a UI atual é mínima (header cinza + lista de bolhas + input). Sem contexto do ticket, sem SLA, sem nome do solicitante, sem ações úteis. Funciona tecnicamente mas não é uma experiência de chat.
>
> **Spec completa em [`docs/CHAT_SCREEN_SPEC.md`](docs/CHAT_SCREEN_SPEC.md)** — 10 lacunas identificadas, 5 etapas de implementação (~7h sem WebSocket, ~10h com), 11 critérios de aceite manual, contratos de endpoint detalhados.

- [ ] Etapa 1 — carregar `ticket` via `useQuery` no chat detail; header rico com avatar + nome + priority + SLA countdown
- [ ] Etapa 2 — endpoint `GET /sla/timer/:ticketId` ou include no `ticket.findById`; componente `<SlaCountdown />`
- [ ] Etapa 3 — ações: "Ver chamado completo", "Adicionar nota interna" (modificar `POST /chat/messages/:ticketId` pra aceitar `isInternal`), anexar foto
- [ ] Etapa 4 — chips de sugestões inline (acima do input); estilizar bolhas internas (amarelo + cadeado)
- [ ] Etapa 5 (opcional fase 2) — WebSocket: typing indicator, read receipts, push de mensagens novas
- [ ] Bug paralelo — adicionar `retry: false` em `useQuery` de `tickets.$id.tsx` pra evitar 4× 404 quando ticket não existe

### 6.11 — Implementação Lovable→Backend (handoff completo pra MiniMax)
> **Origem:** Lovable refatorou o chat estilo WhatsApp (mídia, áudio, emoji, painel flutuante desktop) e fez merge em `feature/chatbot-upgrade` da `profile-driven-app` (commit `cac49ea`, pushado 2026-05-04). UI 100% local — usa `URL.createObjectURL`, não persiste nem propaga via Hermes.
>
> **Doc completo (~600 linhas):** [`docs/CHAT_IMPLEMENTATION_FOR_MINIMAX.md`](docs/CHAT_IMPLEMENTATION_FOR_MINIMAX.md) — gap analysis, 5 etapas sequenciais (A→E ~12h, +F Hermes ~4h), schemas, contratos curl, smoke test E2E, rollback plan, pegadinhas conhecidas.

- [ ] Etapa A — Schema + migration (`mediaUrl`, `fileName`, `fileSize`, `duration`, enum `VIDEO`, model `MessageRead`)
- [ ] Etapa B — Multer + endpoint multipart `POST /chat/messages/:ticketId` aceitando `file`+`kind`+`duration`
- [ ] Etapa C — Read receipts (`POST /chat/messages/:id/read` + `status` derivado em `getMessages`)
- [ ] Etapa D — Frontend: `chatService.sendMessage` aceita `File`, substitui `URL.createObjectURL` blob por upload real; render media com `mediaUrl` do backend
- [ ] Etapa E — Limpeza: remover demos reintroduzidos no main, restaurar tipo `'bot'` no sender, opcionalmente recuperar push/SW/scanner do stash
- [ ] Etapa F (opcional) — Hermes propaga mídia via Baileys (`sendImageMessage`/`sendAudioMessage`/etc.), atualiza `waMessageId` no backend
- [ ] Smoke test E2E (11 passos) aprovado em mobile + desktop
- [ ] PR aberto pra `develop` (não `main` — produção)
- [ ] Etapa G ⚠️ — Privatizar `/uploads/` (LGPD crítico, ver [`docs/LGPD_COMPLIANCE_AUDIT.md`](docs/LGPD_COMPLIANCE_AUDIT.md) item C1)

### 6.12 — Console DEV (Lovable, commit `0633c59`)
> Lovable adicionou rotas `/dev` e `/dev-login` em `origin/main` — dashboard interno com logs, feature flags toggleable em localStorage, status do Hermes, e operações de banco (Eraser/Trash/Download icons). NÃO substitui a arquitetura multi-tenant — coexiste como console interno.

- [x] Rota `/dev` com role `DEV` no `AuthContext`
- [x] `devLog` capturando `window.onerror` + `unhandledrejection`
- [x] Feature flags em localStorage (`ff:` prefix)
- [x] ✅ **CRÍTICO LGPD (item C4):** senha hardcoded `"msm-dev-2026"` — não existia no código (AuthContext.tsx não tem devLogin)
- [ ] ⚠️ **LGPD (item A7):** sanitize `meta` em [`devLog.ts`](../profile-driven-app/src/lib/devLog.ts) — hoje aceita `unknown` e pode gravar PII em localStorage

### 6.13 — Conformidade LGPD (auditoria + remediação)
> **Status:** ⚠️ PARCIAL — C1–C7 resolvidos (2026-05-05). A1–A9 e M1–M6 pendentes. Auditoria completa em [`docs/LGPD_COMPLIANCE_AUDIT.md`](docs/LGPD_COMPLIANCE_AUDIT.md).

**Sprint 1 (≤ 7 dias) — ✅ TODOS COMPLETOS:**
- [x] C1 — Privatizar `/uploads/messages/*` — `HermesApiKeyGuard` em `serveAttachment`
- [x] C2 — Remover fallback `JWT_SECRET || 'secret'` em 3 arquivos (30min)
- [x] C3 — Model `AuditLog` + interceptor global (8h) ⚠️ Requer `prisma db push` em dev (shadow DB corrompido — não usar `migrate dev`)
- [x] C4 — Trocar senha DEV hardcoded — não existia no código atual
- [x] C5 — `GET /api/auth/me/data-export` (Art. 18 II — 6h)
- [x] C6 — `DELETE /api/auth/me` com pseudonimização (Art. 18 IX — 6h)
- [x] C7 — [`docs/INCIDENT_RESPONSE.md`](../docs/INCIDENT_RESPONSE.md) com fluxo ANPD-72h

**Sprint 2 (≤ 30 dias) — ✅ TODOS COMPLETOS (2026-05-10):**
- [x] A1 — Soft delete em User/Ticket/Message/Contact + Prisma 6 Client Extension + `deletedAt` field + `db push` (4h)
- [x] A2 — Logger com redaction de PII — utility `redact.ts` + 27 leaks corrigidos em 13 arquivos (3h)
- [x] A3 — Cron de retention policy — `DataRetentionJob` diário às 03h, 90 dias (6h)
- [x] A4 — Cookie banner / consent modal frontend — `CookieBanner.tsx` no root layout (4h)
- [x] A5 — Rota `/privacy` + Política de Privacidade completa (10 seções LGPD) (4h legal + 1h dev)

**Sprint 3 (≤ 90 dias):**
- [ ] A6 — DPAs com MiniMax/Anthropic/OpenRouter OU truncar PII antes (16h + jurídico)
- [ ] A7 — Sanitize `devLog.meta` (2h)
- [ ] A9 — ClamAV scanning em uploads (4h)
- [ ] M1 — RIPD (PIA) documentado (jurídico)
- [ ] M2 — DPO designado + contato no rodapé
- [ ] Critério de aceite: 10 passos manuais + smoke test curl — ver [`docs/CHAT_FIX_HANDOFF.md`](docs/CHAT_FIX_HANDOFF.md)

---

## 🧪 Smoke Test E2E (2026-05-01 → 2026-05-02)

Stack completa subida e validada localmente. Detalhes em [logs](docs/SMOKE_TEST_2026-05-02.md) (a criar se quiser histórico).

### Stack ativada ✅
- [x] Backend NestJS http://localhost:3000 — health 200
- [x] Hermes Tools bridge :3003 — 10 tools, opossum circuit breaker ativo
- [x] Hermes Gateway — daemon mode (`hermes gateway run`), aguardando pareamento WhatsApp
- [x] PostgreSQL/Redis/RabbitMQ healthy 26h+
- [x] Frontend TI :5173 / Electric :5174 / Compras :5175 (HTTP 200, 3 ports)
- [x] 18 migrations + 1 nova (`20260502120000_ticket_phone_optional`) aplicadas

### Usuários de teste criados ✅ (7 users — admin@helpdesk.com, admin.ti, admin.eletrica, admin.compras, tecnico.ti, tecnico.eletrica, agente.compras)

### Validações E2E que passaram ✅
- [x] Login dos 3 sectors → JWT carrega `{sub, email, role, sector}` corretamente
- [x] Cookie httpOnly em `.helpdeskmsm.com.br` (HttpOnly + Secure + SameSite=Lax) — confirmado em runtime
- [x] CRUD Asset (criar, listar, scan via tag, stats) — endpoints todos 200
- [x] Endpoints autenticados V3 (`/assets`, `/licenses`, `/purchase-requests`, `/sla/dashboard`, `/sla/breaches`, `/auth/me`, `/tickets`) — todos HTTP 200
- [x] **Criar Ticket → SLA Timer auto-gerado com timezone correto** (sex 20:46 → response devida segunda 09:00, respeitando fim de semana + horário comercial)
- [x] DB tabelas V3 todas presentes (assets, asset_assignments, licenses, license_assignments, sla_policies, business_hours, escalation_rules, sla_timers)
- [x] 12 SlaPolicy seedadas (3 sectors × 4 prioridades)

### 4 bugs corrigidos no commit `76f6513` ✅
- [x] **Bug 1**: `POST /tickets` retornava 500 sem `phoneNumber` → schema agora `String?` + DTO opcional + migration
- [x] **Bug 2**: `POST /tickets` ignorava `affectedAssetId` → DTO + service `data:` mapping
- [x] **Bug 3**: `POST /users` ignorava `sector` (sempre TI) → body type + `createLocal` aceita+passa sector
- [x] **Bug 4**: `GET /assets/:id` sem `_count` → findById include `_count: {assignments, tickets, licenses}`

### Bugs ainda pendentes (detectados no smoke test, não bloqueantes)
- [ ] Frontend SSR style hydration warning (TanStack auto-injection vs manual `<link>`) — `suppressHydrationWarning=true` já cuida; some em prod build
- [x] WhatsApp pareado — confirmado via logs `helpdesk_hermes` (2026-05-04)
- [x] `/api/sla/policies` CRUD exposto na API — `GET/POST/PATCH /sla/policies` implementados em `sla.controller.ts:63-85`
- [x] `profile-driven-app` movido para dentro do projeto — `profile-driven-app/` na raiz
- [x] **Bug: chat não carregava ao clicar em conversa** — `chat.$ticketId.tsx` era rota filha de `chat.tsx` sem `<Outlet />`. Corrigido com reestruturação: `chat-layout.tsx` (layout) + `chat/index.tsx` (lista) + `chat/$ticketId.tsx` (chat individual) — 2026-05-04

---

## 📊 Indicadores de qualidade (atualizado 2026-05-10)

| Métrica | Alvo | Atual | Status |
|---------|------|-------|--------|
| Commits ahead de main | < 30 | **170** | 🔴 esperando janela 1-2 sem |
| Refs `glpi` em backend/src | 0 | **0** | ✅ |
| Tests unitários (`.spec.ts`) | ≥ 20 | **7 suites / 69 testes** | ✅ |
| Tests passando | 100% | **69/69 (100%)** | ✅ |
| DTOs com class-validator | ≥ 50 | ~32 | 🟡 |
| Controllers com `@UseGuards(SectorGuard)` | ≥ 8 | **8** (tickets, assets, licenses, purchase-requests, knowledge, team-chat, chat, sla) | ✅ |
| hermes-tools circuit breaker | 10 tools | **10 tools** | ✅ |
| WhatsApp idempotência | Redis TTL | **implementado** | ✅ |
| Cookie httpOnly em produção | implementado | **✅ runtime confirmado** | ✅ |
| Migrations aplicadas (DB ≅ schema) | sim | **19 migrations** | ✅ |
| Backend `tsc --noEmit` | exit 0 | **✅ exit 0** | ✅ |
| docker-compose.yml YAML válido | sim | ✅ `volumes:` e `networks:` em seções separadas | ✅ |
| nginx 4 vhosts (`sites-enabled/helpdeskmsm.conf`) | sim | **✅ 208 linhas** | ✅ |
| 6 colunas GLPI legacy no schema | 0 | **6** (User.glpiUserId, glpiGroupId, Ticket.glpiId+index, Message.glpiId, StockItem.glpiAssetId) | 🟡 dívida pós-merge |
| Stack rodando E2E (8 containers) | sim | **✅ rodando** | ✅ |
| Endpoints frontend↔backend alinhados | 54/54 | **48/54** (6 quebrados) | 🔴 ver [`docs/FRONTEND_BACKEND_AUDIT.md`](docs/FRONTEND_BACKEND_AUDIT.md) |
| WebSocket conectado | sim | **❌ definido mas não importado** | 🔴 |
| Arquivos mortos no backend | 0 | **10** | 🟡 ver auditoria §5 |
| Controllers com Prisma direto | 0 | **5** | 🟡 violação de arquitetura |

---

## 🎯 Próximas ações (prioridade — atualizado 2026-05-10)

### 🔴 Criticidade ALTA (frontend quebrado hoje)

1. **Corrigir path `/assets/scan/{tag}`** — frontend chama `/scan/`, backend tem `/tag/` ([FRONTEND_BACKEND_AUDIT.md](docs/FRONTEND_BACKEND_AUDIT.md) §1.4)
2. **Corrigir path `/knowledge/faq/search`** — frontend chama `/faq/search`, backend tem `/knowledge/search` (§1.5)
3. **Corrigir PATCH vs PUT em `/tickets/{id}/status`** — método HTTP divergente (§1.6)
4. **Recriar endpoint `/ai/reply-suggestions/{ticketId}`** — módulo AI foi deletado, chat precisa (§1.1)
5. **Conectar WebSocket no frontend** — `socket.ts` existe mas nunca é importado (§2)

### 🟡 Criticidade MÉDIA (código morto)

6. Deletar 10 arquivos sem uso: `cache.interceptor.ts`, `cpf.validator.ts`, `require-permissions.decorator.ts`, `trigger-webhook.decorator.ts`, `file-validation.pipe.ts`, `email-config.dto.ts`, `knowledge.dto.ts`, `auth.dto.ts`, `assign-asset.uc.ts`, `return-asset.uc.ts` (§5)
7. Remover `report-recipients.module.ts` órfão
8. Corrigir AuditInterceptor duplo (registrado em `audit.module.ts` E `app.module.ts`)
9. Unificar `ContactsController` + `ContactsEnhancedController` (mesmo prefixo, rotas conflitantes)
10. Remover diretório `health/` vazio e `external.module.ts` shell
11. Remover import `IdempotencyInterceptor` de `main.ts`
12. Corrigir `RolesModule` comentado em `app.module.ts:42` referenciando diretório inexistente

### 🟢 Criticidade BAIXA (futuro / pós-merge)

13. Implementar páginas frontend para ~20 módulos sem UI (Parts, Printers, Reservations, CSAT, Automation, Labels, etc.)
14. Corrigir violações de arquitetura: 5 controllers injetam PrismaService direto (`auto-assignment`, `automation`, `admin`, `chat`, `team-chat`)
15. Tornar SectorGuard funcional ou removê-lo (no-op em 9 controllers)
16. Unificar auth guards (`JwtAuthGuard` vs `AuthGuard('jwt')` — 7 vs ~30 controllers)
17. Implementar páginas placeholder: `purchases.$id.tsx`, `safety.tsx`, `manual-service.tsx`
18. `LoansPanel.tsx` ainda usa `mockLoans` hardcoded
19. `AssistantPanel.tsx` em demo mode (TODO: conectar Hermes)

### 🟡 Antes da janela de merge

20. **Forward-merge `git merge origin/main`** semanal para manter feature current
21. Smoke test em device móvel real (instalar PWA, escanear QR, criar ticket com foto)

### 🚀 Janela de merge (sequencial, ver §9 do plano)

22. `git checkout develop && git merge --no-ff feature/chatbot-upgrade` → push → migrations → monitorar 24-48h
23. Se OK, repetir para `main`
24. Tag `v3.0.0`

### ⏳ Deferred (pós-merge)

25. Drop 6 colunas GLPI legacy do schema
26. iOS push tutorial ("Add to Home Screen")
27. Background sync offline ticket creation
28. Refatoração Clean Arch v2 (extrair use cases dos controllers que importam Prisma direto)
29. Reduzir `: any` types (149 → < 30)
30. Prisma 6 → 7 major upgrade

---

## 📁 Arquivos importantes (referência rápida)

| Arquivo | Propósito |
|---------|-----------|
| [IMPLEMENTATION_PLAN_V3.md](IMPLEMENTATION_PLAN_V3.md) | Plano vigente — arquitetura, fases, deploy strategy |
| [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) | Este arquivo — estado operacional |
| [INTEGRATION_PLAN_LOVABLE.md](INTEGRATION_PLAN_LOVABLE.md) | Plano de integração frontend |
| [docs/FRONTEND_BACKEND_AUDIT.md](docs/FRONTEND_BACKEND_AUDIT.md) | Auditoria cross-FE↔BE (gaps, código morto) |
| [CLAUDE.md](CLAUDE.md) | Instruções para agentes — convenções, restrições, decisões irrevogáveis |
| [AGENTS.md](AGENTS.md) | Armadilhas conhecidas + padrões do repo |
| [IMPLEMENTATION_PLAN_V2.archived.md](IMPLEMENTATION_PLAN_V2.archived.md) | Plano anterior arquivado (referência histórica) |