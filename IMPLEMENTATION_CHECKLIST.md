# Checklist de Implementação V3

> Snapshot de progresso em **2026-04-29** baseado em auditoria QA contra `IMPLEMENTATION_PLAN_V3.md`.
> Marcar `[x]` quando concluir. Atualizar este arquivo a cada commit relevante.

**Estado atual:** Fase 0 ~90% · Fase 1 ~70% · Fases 2-6 não iniciadas
**Branch:** `feature/chatbot-upgrade` · 143 commits ahead de `main` · 7 arquivos sem commit

---

## 🔴 Fase 1.5 — Fechamento (FAZER ANTES DE FASE 2)

Limpeza dos restos da Fase 1 + rebase. Estimativa: 30-60min.

### Commits pendentes
- [ ] Commitar deleção: [bot-tickets.controller.ts](backend/src/presentation/controllers/tickets/bot-tickets.controller.ts) (resto do bot legado)
- [ ] Commitar mudança: [tickets.module.ts](backend/src/presentation/controllers/tickets/tickets.module.ts)
- [ ] Commitar mudança: [users.dto.ts](backend/src/presentation/controllers/users/users.dto.ts)
- [ ] Decidir destino do `hermes-agent` (untracked) — submodule ou tracked?
- [ ] Decidir destino dos submodules `suport-eletric`, `support-compras`, `support-mobile` (vão ser obsoletos na Fase 6)

### Eliminar refs GLPI restantes (10 arquivos)
- [ ] [backend/src/main.ts](backend/src/main.ts)
- [ ] [backend/src/config/env.validation.ts](backend/src/config/env.validation.ts)
- [ ] [backend/src/presentation/controllers/users/users.service.ts](backend/src/presentation/controllers/users/users.service.ts)
- [ ] [backend/src/presentation/controllers/messages/messages.service.ts](backend/src/presentation/controllers/messages/messages.service.ts)
- [ ] [backend/src/presentation/controllers/tickets/tickets.controller.ts](backend/src/presentation/controllers/tickets/tickets.controller.ts)
- [ ] [backend/src/presentation/controllers/tickets/tickets.service.ts](backend/src/presentation/controllers/tickets/tickets.service.ts)
- [ ] [backend/src/presentation/controllers/purchases/purchases.service.ts](backend/src/presentation/controllers/purchases/purchases.service.ts)
- [ ] [backend/src/presentation/controllers/metrics/metrics.service.ts](backend/src/presentation/controllers/metrics/metrics.service.ts)
- [ ] [backend/src/infrastructure/services/alert.service.ts](backend/src/infrastructure/services/alert.service.ts)
- [ ] [backend/src/infrastructure/cache/redis.service.ts](backend/src/infrastructure/cache/redis.service.ts)
- [ ] Validar: `grep -rln "glpi\|GLPI" backend/src` retorna **vazio**

### Limpar `docker-compose.dev.yml`
- [ ] Remover service `glpi:`
- [ ] Remover service `mysql:` (era dependência do GLPI)
- [ ] Remover volumes `glpi_*`, `mysql_*` se houver

### Limpar env
- [ ] Remover `GLPI_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN` de `.env.example`
- [ ] Remover do `.env` local
- [ ] Remover validações em [env.validation.ts](backend/src/config/env.validation.ts)

### Validação de build
- [ ] `cd backend && bun run build` compila sem erros (ou `npm run build`)
- [ ] `docker compose -f docker-compose.dev.yml up backend` sobe sem crash
- [ ] Smoke test: `POST /auth/login` retorna JWT, `GET /tickets` retorna lista filtrada por sector

### Rebase
- [ ] `git fetch origin main`
- [ ] `git rebase origin/main` em `feature/chatbot-upgrade`
- [ ] Resolver conflitos
- [ ] CI passa
- [ ] Push (sem `--force-with-lease` se branch é compartilhado; com se for só seu)

---

## ✅ Fase 0 — Estabilização (~90%)

- [x] Snapshot antes do V3 — commit `f14f609`
- [x] Fix IDOR em [tickets.controller.ts:33](backend/src/presentation/controllers/tickets/tickets.controller.ts#L33) — commit `6cf25d4`
- [x] JWT com `sector`+`role` em [auth.service.ts:96-99](backend/src/presentation/controllers/auth/auth.service.ts#L96-L99) — commit `6cf25d4`
- [x] `Sector` enum em [schema.prisma:82](backend/prisma/schema.prisma#L82) + migration — commit `53f9b3a`
- [x] Limpeza dos 32 `.md` deletados (incluído no snapshot)
- [x] Setup Jest + 1 spec (TicketsService) — commit `932b1ae`
- [ ] **Rebase em main** ← movido para Fase 1.5

---

## 🔄 Fase 1 — Remover bot + GLPI (~70%)

### Bot legado ✅ DONE
- [x] `bot/src/` deletado
- [x] `BotModule` removido — commit `8953b26`
- [x] Service `bot:` removido de `docker-compose.dev.yml`
- [x] Service `bot:` removido de `docker-compose.yml` (prod) — commit `e1f01a2`
- [x] Pasta `bot/` removida do filesystem
- [ ] [bot-tickets.controller.ts](backend/src/presentation/controllers/tickets/bot-tickets.controller.ts) ← deletado mas não commitado (Fase 1.5)

### GLPI 🔄 PARCIAL
- [x] `glpi.service.ts` deletado — commit `a41ef9a`
- [x] `glpi-sync.service.ts` deletado — commit `a41ef9a`
- [x] GLPI endpoints em `users.controller.ts` removidos — commit `b774da8`
- [x] Service `glpi:` removido de `docker-compose.yml` (prod) — commit `e1f01a2`
- [ ] Service `glpi:` removido de `docker-compose.dev.yml` ← Fase 1.5
- [ ] Service `mysql:` removido de `docker-compose.dev.yml` ← Fase 1.5
- [ ] Refs `glpi/GLPI` em 10 arquivos eliminadas ← Fase 1.5
- [ ] Env vars `GLPI_*` removidas ← Fase 1.5

---

## ⏳ Fase 2 — CMDB nativo (não iniciada)

### Schema Prisma
- [ ] Model `Asset` com fields: tag, serialNumber, name, category, status, sector, location, manufacturer, model, purchaseDate, warrantyEndsAt, currentUserId
- [ ] Enum `AssetCategory` (COMPUTER, LAPTOP, PRINTER, PHONE, PERIPHERAL, NETWORK_DEVICE, ELECTRICAL_TOOL, OTHER)
- [ ] Enum `AssetLifecycle` (IN_STOCK, IN_USE, IN_MAINTENANCE, RETIRED, LOST)
- [ ] Model `AssetAssignment` (histórico de atribuições)
- [ ] Model `License` + enum `LicenseType`
- [ ] Model `LicenseAssignment`
- [ ] Adicionar `affectedAssetId String?` em `Ticket`
- [ ] Migration `add_cmdb_models`

### Backend
- [ ] Pasta `backend/src/presentation/controllers/assets/`
  - [ ] `assets.controller.ts` — CRUD
  - [ ] `assets.service.ts`
  - [ ] `assets.module.ts`
  - [ ] `assets.dto.ts` com class-validator
- [ ] Endpoint `POST /assets/:id/assign` (atribuir a User)
- [ ] Endpoint `POST /assets/:id/return` (devolver)
- [ ] Endpoint `GET /assets/scan/:tag` (resolver QR — para PWA mobile)
- [ ] Pasta `backend/src/presentation/controllers/licenses/`
  - [ ] CRUD + assignment
- [ ] Use cases em `backend/src/application/use-cases/` (criar pasta)
  - [ ] `assign-asset.uc.ts`
  - [ ] `return-asset.uc.ts`

### Migração de dados
- [ ] Script `prisma/seeds/migrate-printers-to-assets.ts` (idempotente, dry-run)
- [ ] Manter model `Printer` por 1 sprint como sombra
- [ ] Deletar `Printer` model após confirmação

### Tests
- [ ] Spec `assign-asset.uc.spec.ts`
- [ ] Spec `return-asset.uc.spec.ts`

### Critério de done
- [ ] Cadastrar computador → atribuir a usuário → abrir ticket linkado → ver histórico

---

## ⏳ Fase 3 — SLA Engine (não iniciada)

### Schema
- [ ] Model `SlaPolicy` (sector, priority, responseTimeMins, resolutionTimeMins, businessHoursId)
- [ ] Model `BusinessHours` (timezone, schedule JSON, holidays JSON)
- [ ] Model `SlaTimer` 1:1 com Ticket
- [ ] Model `EscalationRule` + enum `EscalationTrigger`
- [ ] Migration `add_sla`

### Backend
- [ ] Pasta `backend/src/infrastructure/sla/`
  - [ ] `sla-calculator.service.ts` (timezone + business hours + holidays)
  - [ ] Lib: `date-fns-tz` ou `dayjs` + `business-time` plugin
- [ ] Hook em `TicketsService.create()` → cria `SlaTimer`
- [ ] Hook em `TicketsService.updateStatus()` → marca `responseMetAt`/`resolutionMetAt`/pause em WAITING_USER
- [ ] Worker `backend/src/infrastructure/jobs/sla-breach.job.ts` (cron 1min)
  - [ ] Detecta breach iminente (80% do prazo)
  - [ ] Detecta breach efetivo
  - [ ] Aplica `EscalationRule`
  - [ ] Emite WebSocket + dispara Hermes
- [ ] Endpoints `GET/POST /sla/policies`, `GET /sla/dashboard`
- [ ] Seeds: 6 SlaPolicy padrão (3 sectors × 2 prioridades mínimas)

### Critério de done
- [ ] Ticket fora do horário comercial não conta minutos até segunda 8h
- [ ] Breach iminente notifica gestor

---

## ⏳ Fase 4 — PurchaseRequest CRUD (não iniciada)

### Schema
- [ ] Adicionar `PURCHASED` ao enum `PurchaseRequestStatus`
- [ ] Adicionar `DELIVERED` ao enum
- [ ] Adicionar `requestedById` em `PurchaseRequest` (faltando)
- [ ] Adicionar `ticketId String?` (relação opcional com Ticket)
- [ ] Migration

### Backend
- [ ] Pasta `backend/src/presentation/controllers/purchase-requests/` (não confundir com `purchases/`)
  - [ ] `purchase-requests.controller.ts`
  - [ ] `purchase-requests.service.ts`
  - [ ] `purchase-requests.module.ts`
  - [ ] `purchase-requests.dto.ts` com class-validator
- [ ] Endpoint `POST /purchase-requests` — `@Roles(ADMIN_TI, ADMIN_ELECTRIC, AGENT)`
- [ ] Endpoint `GET /purchase-requests` — COMPRAS vê tudo, outros só do sector
- [ ] Endpoint `PATCH /:id/approve` — `@Roles(ADMIN_COMPRAS)`
- [ ] Endpoint `PATCH /:id/reject` — `@Roles(ADMIN_COMPRAS)`, `rejectionReason` obrigatório
- [ ] Endpoint `PATCH /:id/mark-purchased` — `@Roles(ADMIN_COMPRAS)`
- [ ] Endpoint `PATCH /:id/mark-delivered`
- [ ] Eventos RabbitMQ ao mudar status (para WS + Hermes)

### Critério de done
- [ ] Técnico TI cria requisição → Compras aprova → notificação volta via WhatsApp

---

## ⏳ Fase 5 — Hermes orchestration (não iniciada)

### Skill principal
- [ ] Pasta `hermes-integration/skills/helpdesk-conversation/`
  - [ ] `SKILL.md` (orquestrador das 5 skills atômicas)
- [ ] Definir intent routing: ticket / status / faq / asset / escalation

### Idempotência
- [ ] Tabela `WhatsAppMessageProcessed` (ou Redis com TTL 24h)
- [ ] Dedup por `wa_message_id` no bridge

### Resiliência
- [ ] Circuit breaker em [hermes-integration/backend-tools/server.js](hermes-integration/backend-tools/server.js) — pkg `opossum`
- [ ] Endpoint `POST /tools/auto-resolve-attempt` no bridge (Hermes consulta captain-assistant)
- [ ] Hermes responde "abra ticket pelo portal" quando backend cai

### WhatsApp infra
- [ ] Script `scripts/hermes-reconnect.sh` para regenerar sessão
- [ ] Backup diário do volume `hermes_whatsapp_session`

### Captain como tool do Hermes
- [ ] Refatorar fluxo: Hermes chama auto-resolve antes de criar ticket
- [ ] Se confidence ≥ 0.85, responde direto sem abrir chamado

### Critério de done
- [ ] "minha impressora não imprime" → Hermes consulta KB → conversa coleta dados → cria ticket linkado ao Asset → SLA dispara

---

## ⏳ Fase 6 — Frontend + PWA mobile (não iniciada)

### 6.1 — Dockerizar e conectar
- [ ] `git clone https://github.com/Berg-2019/profile-driven-app.git ~/Projetos/profile-driven-app`
- [ ] Trocar adapter para Node.js (build SPA estático) em `vite.config.ts`
- [ ] `Dockerfile` multi-stage (Bun → nginx)
- [ ] Service `frontend` em `docker-compose.dev.yml` e `docker-compose.yml`
- [ ] `nginx/sites-enabled/helpdeskmsm.conf` com 4 server blocks (ti.*, eletrica.*, compras.*, api.*)
- [ ] Cert wildcard `*.helpdeskmsm.com.br` (Let's Encrypt DNS-01)
- [ ] Função `detectSectorFromHost()` em `src/lib/sector.ts`
- [ ] CORS no backend aceita 3 origens com `credentials: true`
- [ ] Adaptar `AuthContext.tsx` para cookie httpOnly em `.helpdeskmsm.com.br`
- [ ] Backend seta cookie com `Domain=.helpdeskmsm.com.br; SameSite=Lax; Secure`
- [ ] Axios global com `withCredentials: true`
- [ ] Validação host vs sector no backend (defesa em profundidade)

### 6.2 — Multi-tenancy via host + role
- [ ] `ThemeContext.tsx` lê sector via host (não JWT)
- [ ] CSS vars aplicadas em `<html data-sector>`
- [ ] Redirect 403 para subdomínio correto quando `user.sector ≠ host`
- [ ] `src/lib/menu.ts` profile-driven baseado em role
- [ ] Route gates `beforeLoad` em `_authed/`
- [ ] Dashboard adaptativo por sector

### 6.3 — Features de domínio
- [ ] `_authed/tickets/` (list + detail + create com upload de foto)
- [ ] `_authed/assets/` (list + detail + assign + scan QR)
- [ ] `_authed/purchase-requests/` (list + detail + approve/reject)
- [ ] `_authed/knowledge/` (KB + FAQ)
- [ ] `_authed/admin/sla-policies/`
- [ ] `_authed/admin/business-hours/`
- [ ] `_authed/admin/users/`
- [ ] `_authed/safety/` (NR-10/35) — só ELECTRIC
- [ ] `_authed/tool-loans/` — só ELECTRIC
- [ ] `_authed/reports/` — COMPRAS/ADMIN
- [ ] WebSocket client + invalidate queries em events
- [ ] Badge de SLA (verde/amarelo/vermelho) em ticket

### 6.4 — PWA mobile-first
#### Manifest (3 arquivos)
- [ ] `public/manifest-ti.webmanifest` (azul, ícones TI, shortcuts)
- [ ] `public/manifest-electric.webmanifest` (dourado, shortcuts safety)
- [ ] `public/manifest-compras.webmanifest` (verde, shortcuts compras)
- [ ] Cada manifest com `id` único (PWAs distintas no celular)
- [ ] `share_target` em todos (foto → novo ticket)
- [ ] `shortcuts` (long-press abre ações principais)
- [ ] nginx serve manifest correto por host
- [ ] Ícones gerados em 3 variantes (precisa do design)

#### Service Worker (Workbox via vite-plugin-pwa)
- [ ] Precache de build assets
- [ ] Network-first em GETs (`/api/tickets`, `/api/assets`)
- [ ] **Background sync em POSTs** (criar ticket offline)
- [ ] Stale-while-revalidate em KB e imagens
- [ ] `public/offline.html`
- [ ] Registrar SW só em `import.meta.env.PROD`
- [ ] Update flow (toast "Nova versão" + reload)

#### Features mobile-native
- [ ] Câmera no anexo de ticket (`capture="environment"`)
- [ ] Compressão client-side (`browser-image-compression`)
- [ ] QR scanner em `/assets/scan` (`barcode-detector` + fallback `@zxing/browser`)
- [ ] Botão de lanterna no scanner (`ImageCapture API`)
- [ ] Geolocation opcional (opt-in) no campo location
- [ ] Web Share API para compartilhar ticket
- [ ] Vibration em SLA breach iminente

#### Push Notifications
- [ ] Gerar VAPID keys
- [ ] Pacote `web-push` no backend
- [ ] Model `PushSubscription` no Prisma
- [ ] Endpoint `POST /push/subscribe`
- [ ] Disparar push em: ticket atribuído, SLA breach iminente, PR aprovado/rejeitado
- [ ] Settings `/settings/notifications` (opt-in granular)
- [ ] Tutorial iOS "Add to Home Screen" (push só funciona instalado)

#### UX mobile
- [ ] Touch targets ≥ 44x44px
- [ ] Bottom navigation (mobile) / sidebar (tablet+)
- [ ] Pull-to-refresh em listas
- [ ] Swipe actions em ticket cards
- [ ] Safe areas iOS (`env(safe-area-inset-*)`)
- [ ] `inputmode` correto por campo
- [ ] Modo paisagem em Safety Checklist Electric
- [ ] Skeleton screens (não spinners)
- [ ] Tablet split view (lista + detalhe)

#### Performance 3G
- [ ] Bundle inicial ≤ 200KB gzip
- [ ] Code splitting por rota
- [ ] `<img loading="lazy">` + `srcset` + `sizes`
- [ ] Adaptive loading via `navigator.connection.effectiveType`

### 6.5 — Dev local (3 portas)
- [ ] Scripts `bun run dev:ti / dev:electric / dev:compras / dev:all`
- [ ] `concurrently` para rodar os 3 em paralelo
- [ ] Backend CORS aceita `localhost:5173/5174/5175`
- [ ] `docker-compose.staging.yml` para smoke test multi-subdomínio

### 6.6 — QA
- [ ] Tests E2E Playwright (3 fluxos: TI cria ticket, ELECTRIC checklist, COMPRAS aprova)
- [ ] Lighthouse mobile: Performance ≥ 85, PWA ≥ 95, A11y ≥ 95
- [ ] axe-core: zero erros críticos
- [ ] Smoke test em device real (Android Chrome + iOS Safari)
- [ ] **Teste de campo**: tablet no prédio MSM, instalar PWA, escanear QR, criar ticket com foto

### Critério de done Fase 6
- [ ] `docker compose up` sobe stack completa, end-to-end funcional
- [ ] 3 subdomínios servindo o mesmo build com temas diferentes
- [ ] PWA instalável em Android E iOS
- [ ] Técnico em campo: instalar → escanear QR → criar ticket com foto → push de SLA chega
- [ ] Background sync funciona (criar ticket offline e ver sincronizar online)

---

## 📊 Indicadores de qualidade transversais

Atualizar quando mover de fase:

| Métrica | Alvo | Atual |
|---------|------|-------|
| Commits ahead de main | < 30 | **143** ❌ |
| Arquivos sem commit | 0 | 7 ❌ |
| Refs `glpi` em backend/src | 0 | 10 ❌ |
| Tests `.spec.ts` em backend | ≥ 20 | 1 ❌ |
| DTOs com class-validator | ≥ 50 files | 28 🔄 |
| Controllers com `@UseGuards(SectorGuard)` | ≥ 8 | 2 🔄 |
| Cookie httpOnly implementado | sim | não ❌ |
| Camada `application/` existe | sim | não ❌ |

---

## 🎯 Próximas 3 ações concretas

1. **Fase 1.5 fechamento** (30-60min) — limpar GLPI restante, commitar pendências, rebase.
2. **Fase 2 CMDB** (1 sem) — `Asset`, `License`, módulo, migração `Printer→Asset`.
3. **Fase 3 SLA** (1 sem) — engine de prazo + worker de breach.
