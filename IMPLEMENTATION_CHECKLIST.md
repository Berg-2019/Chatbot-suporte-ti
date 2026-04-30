# Checklist de Implementação V3

> Snapshot de progresso em **2026-04-30** baseado em auditoria QA contra `IMPLEMENTATION_PLAN_V3.md`.
> Marcar `[x]` quando concluir. Atualizar este arquivo a cada commit relevante.

**Estado atual:** Fases 0-5 ✅ completas · Fase 6 🔄 em progresso
**Branch:** `feature/chatbot-upgrade` · 154 commits ahead de `main`

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
- [x] `profile-driven-app` clonado em `~/Projetos/profile-driven-app/`
- [x] `nginx/sites-enabled/helpdeskmsm.conf` com 4 server blocks — commit `6b1cfa8`
- [x] Service `frontend` em docker-compose.dev.yml (comentado, aguardando build)
- [x] CORS no backend aceita 3 origens com `credentials: true` ✅ (app.module.ts verificado)
- [x] AuthContext com cookie httpOnly ✅ (Fase 0)

### 6.2 — Multi-tenancy via host + role
- [x] `ThemeContext.tsx` lê sector via host com `detectSectorFromHost()`
- [x] CSS vars por setor aplicadas ✅
- [ ] Redirect 403 para subdomínio correto quando `user.sector ≠ host`
- [ ] Route gates `beforeLoad` em `_authed/`

### 6.3 — Features de domínio
- [x] `_authed/tickets/` (list + detail + create com foto) ✅
- [x] `_authed/assets/` (list + detail + assign + scan QR) ✅
- [x] `_authed/purchase-requests/` (list + detail + approve/reject) ✅
- [x] `_authed/knowledge/` (KB + FAQ) ✅
- [x] `_authed/safety/` (NR-10/35 checklists) ✅ — commit `b6a121c` (chinês→pt-BR)
- [ ] `_authed/admin/sla-policies/`
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
- [ ] UI de toggle push em settings
- [ ] Background sync em POSTs (offline ticket creation)
- [ ] Ícones PNG para PWA (3 variantes por setor) — dirs vazios
  - `public/icons/ti/` — VAZIO
  - `public/icons/electric/` — VAZIO
  - `public/icons/compras/` — VAZIO

### Push Notifications ✅ (backend)
- [x] `PushSubscription` model + migration — commit `4960dda`
- [x] `POST /push/subscribe` e `DELETE /push/unsubscribe` — commit `ac3a07f`
- [x] `PushService.sendToUser()` — commit `cc2a93f`
- [x] Dispara em: ticket atribuído (`cc2a93f`), PR aprovado/rejeitado (`cc2a93f`)

### 6.5 — Dev local
- [ ] Scripts `bun run dev:ti / dev:electric / dev:compras / dev:all`
- [ ] `docker-compose.staging.yml` para smoke test multi-subdomínio

### 6.6 — QA
- [ ] Tests E2E Playwright (3 fluxos: TI cria ticket, ELECTRIC checklist, COMPRAS aprova) — commit `0d1f880`
- [ ] Lighthouse mobile: Performance ≥ 85, PWA ≥ 95, A11y ≥ 95
- [ ] Teste de campo: tablet no prédio MSM, instalar PWA, escanear QR

---

## 📊 Indicadores de qualidade (atualizado 2026-04-30)

| Métrica | Alvo | Atual | Status |
|---------|------|-------|--------|
| Commits ahead de main | < 30 | **154** | ❌ |
| Refs `glpi` em backend/src | 0 | **0** | ✅ |
| Tests unitários (`.spec.ts`) | ≥ 20 | **8 suites / 76+ testes** | ✅ |
| Tests passando | 100% | **69/69 (91%)** | 🔄 |
| DTOs com class-validator | ≥ 50 | ~32 | 🔄 |
| Controllers com `@UseGuards(SectorGuard)` | ≥ 8 | ~2-3 | 🔴 |
| hermes-tools circuit breaker | 10 tools | **10 tools** | ✅ |
| WhatsApp idempotência | Redis TTL | **implementado** | ✅ |

---

## 🎯 Próximas ações (prioridade)

### Alta prioridade
1. **UI push notifications toggle em settings** — só falta a UI no frontend
2. **Frontend icons PNG** — dirs vazios impedem PWA installável (precisa design ou placeholder SVG)
3. **Rebase em main** — 154 commits ahead está crítico

### Média prioridade
4. Validar worker SLA cron em runtime (requer DB online)
5. Route gate `beforeLoad` para sector mismatch
6. E2E tests Playwright

### Baixa (deferred)
7. iOS push tutorial ("Add to Home Screen")
8. Background sync offline ticket creation
9. PWA icons definitivos (precisa design)