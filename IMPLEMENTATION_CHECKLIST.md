# Checklist de Implementação V3

> Snapshot de progresso em **2026-04-30** baseado em auditoria QA contra `IMPLEMENTATION_PLAN_V3.md`.
> Marcar `[x]` quando concluir. Atualizar este arquivo a cada commit relevante.

**Estado atual:** Fases 0-4 ✅ completas · Fase 5 ✅ completa · Fase 6 🔄 em progresso
**Branch:** `feature/chatbot-upgrade` · 161 commits ahead de `main` · arquivos pendentes de commit

---

## ✅ Fase 0 — Estabilização (COMPLETA)

- [x] Snapshot antes do V3 — commit `f14f609`
- [x] Fix IDOR em tickets.controller.ts — commit `6cf25d4`
- [x] JWT com `sector`+`role` em auth.service.ts — commit `6cf25d4`
- [x] `Sector` enum em schema.prisma + migration — commit `53f9b3a`
- [x] Setup Jest + spec (TicketsService) — commit `932b1ae`
- [x] Tests unitários: 69/69 passando (`npm run test`)
- [x] package.json script `test` corrigido para usar `jest.config.js`
- [ ] **Rebase em main** ← recomendado antes de merge final

---

## ✅ Fase 1 — Remover bot + GLPI (~95%)

### Bot legado ✅ DONE
- [x] `bot/src/` deletado — commit `a41ef9a`
- [x] `BotModule` removido — commit `8953b26`
- [x] Service `bot:` removido de `docker-compose.dev.yml` — commit `da23bec`
- [x] Service `bot:` removido de `docker-compose.yml` (prod) — commit `e1f01a2`
- [x] Pasta `bot/` removida do filesystem

### GLPI ✅ DONE (refsGLPI = 0 no grep)
- [x] `glpi.service.ts` deletado — commit `a41ef9a`
- [x] `glpi-sync.service.ts` deletado — commit `a41ef9a`
- [x] GLPI endpoints em `users.controller.ts` removidos — commit `b774da8`
- [x] Service `glpi:` removido de `docker-compose.yml` (prod) — commit `e1f01a2`
- [x] Service `glpi:` e `mysql:` removidos de `docker-compose.dev.yml` — commit `da23bec`
- [x] Env vars `GLPI_*` removidas de env.validation
- [x] `grep -ri "glpi" backend/src/` retorna vazio

### pending (limpeza residual)
- [ ] Commitar arquivos modificados pendentes (schema.prisma, purchase-requests, etc)

---

## ✅ Fase 2 — CMDB nativo (COMPLETA ~95%)

### Schema Prisma ✅
- [x] Model `Asset` — commit `3bf75fe`
- [x] Enum `AssetCategory` (COMPUTER, LAPTOP, PRINTER, PHONE, PERIPHERAL, NETWORK_DEVICE, ELECTRICAL_TOOL, OTHER)
- [x] Enum `AssetLifecycle` (IN_STOCK, IN_USE, IN_MAINTENANCE, RETIRED, LOST)
- [x] Model `AssetAssignment` (histórico de atribuições)
- [x] Model `License` + enum `LicenseType`
- [x] Model `LicenseAssignment`
- [x] `affectedAssetId String?` em `Ticket`
- [x] Migration `add_cmdb_assets_licenses` — commit `3bf75fe`

### Backend ✅
- [x] Pasta `backend/src/presentation/controllers/assets/` completa
- [x] `assets.controller.ts` — CRUD
- [x] `assets.service.ts`
- [x] `assets.module.ts`
- [x] `assets.dto.ts` com class-validator
- [x] `POST /assets/:id/assign`
- [x] `POST /assets/:id/return`
- [x] Pasta `backend/src/presentation/controllers/licenses/` completa
- [x] Use cases `assign-asset.uc.ts` e `return-asset.uc.ts`
- [ ] Script `migrate-printers-to-assets.ts` ← opcional (Printer legado ainda existe)

### Tests ✅
- [x] `assign-asset.uc.spec.ts` — 4 testes passando
- [x] `return-asset.uc.spec.ts` — 4 testes passando
- [x] `assets.service.spec.ts` — 12 testes passando
- [x] `licenses.service.spec.ts` — 10 testes passando

---

## ✅ Fase 3 — SLA Engine (COMPLETA ~90%)

### Schema ✅
- [x] Model `SlaPolicy` — commit `b8a7d76`
- [x] Model `BusinessHours` (timezone, schedule JSON, holidays JSON)
- [x] Model `SlaTimer` (1:1 com Ticket)
- [x] Model `EscalationRule` + enum `EscalationTrigger`
- [x] Migration `add_sla_engine` — commit `b8a7d76`

### Backend ✅
- [x] Pasta `backend/src/infrastructure/sla/`
- [x] `sla-calculator.service.ts`
- [x] Hook em `TicketsService.create()` → cria `SlaTimer` — commit `85a4bab`
- [x] Hook em `TicketsService.updateStatus()` — commit `85a4bab`
- [x] Worker `sla-breach.job.ts` (cron 1min)
- [x] Endpoints `GET/POST /sla/policies`
- [x] Seeds: 6 SlaPolicy padrão
- [ ] Validar worker cron em runtime ← smoke test

### Tests ✅
- [x] `sla.service.spec.ts` — 11 testes passando

---

## ✅ Fase 4 — PurchaseRequest CRUD (COMPLETA ~90%)

### Schema ✅
- [x] `PURCHASED` e `DELIVERED` no enum `PurchaseRequestStatus`
- [x] `requestedById` em `PurchaseRequest`
- [x] `ticketId String?` (relação opcional com Ticket)
- [x] `purchasedById`, `purchasedAt`, `deliveredById`, `deliveredAt` adicionados
- [x] Migration

### Backend ✅
- [x] Pasta `backend/src/presentation/controllers/purchase-requests/` completa
- [x] `purchase-requests.controller.ts`
- [x] `purchase-requests.service.ts`
- [x] `purchase-requests.module.ts`
- [x] `purchase-requests.dto.ts` com class-validator
- [x] `POST /purchase-requests` — `@Roles(ADMIN_TI, ADMIN_ELECTRIC, AGENT)`
- [x] `GET /purchase-requests` — COMPRAS vê tudo, outros só do sector
- [x] `PATCH /:id/approve` — `@Roles(ADMIN_COMPRAS)`
- [x] `PATCH /:id/reject` — `@Roles(ADMIN_COMPRAS)`, `rejectionReason` obrigatório
- [x] `PATCH /:id/mark-purchased` — `@Roles(ADMIN_COMPRAS)`
- [x] `PATCH /:id/mark-delivered` — `@Roles(ADMIN_COMPRAS, ADMIN_TI, ADMIN_ELECTRIC)`
- [x] Eventos RabbitMQ ao mudar status

### Tests ✅
- [x] `purchase-requests.service.spec.ts` — 15 testes passando (PushService mock corrigido)

---

## ✅ Fase 5 — Hermes orchestration (COMPLETA)

### Skill principal ✅
- [x] `hermes-integration/skills/helpdesk-conversation/SKILL.md` (orquestrador)
- [x] 5 skills atômicas: helpdesk-faq, helpdesk-create-ticket, helpdesk-check-status, helpdesk-reserve-equipment, helpdesk-escalate

### Idempotência ✅
- [x] `RedisService.tryMarkMessageProcessed()` com TTL 24h — backend/src/infrastructure/cache/redis.service.ts:191
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
- [ ] Build SPA do frontend
- [ ] CORS no backend aceita 3 origens com `credentials: true` ← verificar app.module
- [ ] AuthContext adaptar para cookie httpOnly em `.helpdeskmsm.com.br`

### 6.2 — Multi-tenancy via host + role
- [ ] `ThemeContext.tsx` lê sector via host (não JWT)
- [ ] CSS vars aplicadas em `<html data-sector>`
- [ ] Redirect 403 para subdomínio correto quando `user.sector ≠ host`
- [ ] Route gates `beforeLoad` em `_authed/`

### 6.3 — Features de domínio
- [ ] `_authed/tickets/` (list + detail + create)
- [ ] `_authed/assets/` (list + detail + assign)
- [ ] `_authed/purchase-requests/` (list + detail + approve/reject)
- [ ] `_authed/knowledge/` (KB + FAQ)
- [ ] `_authed/admin/sla-policies/`
- [ ] WebSocket client + invalidate queries
- [ ] Badge de SLA (verde/amarelo/vermelho) em ticket

### 6.4 — PWA mobile-first
- [ ] `public/manifest-ti.webmanifest`
- [ ] `public/manifest-electric.webmanifest`
- [ ] `public/manifest-compras.webmanifest`
- [ ] Service Worker (Workbox)
- [ ] Câmera no anexo de ticket
- [ ] QR scanner em `/assets/scan`
- [ ] Push notifications

### 6.5 — Dev local (3 portas)
- [ ] Scripts `bun run dev:ti / dev:electric / dev:compras / dev:all`
- [ ] `docker-compose.staging.yml` para smoke test multi-subdomínio

### 6.6 — QA
- [ ] Tests E2E Playwright (3 fluxos)
- [ ] Lighthouse mobile: Performance ≥ 85, PWA ≥ 95, A11y ≥ 95

---

## 📊 Indicadores de qualidade (atualizado 2026-04-30)

| Métrica | Alvo | Atual | Status |
|---------|------|-------|--------|
| Commits ahead de main | < 30 | **161** | ❌ |
| Refs `glpi` em backend/src | 0 | **0** | ✅ |
| Tests unitários (`.spec.ts`) | ≥ 20 | **8 suites / 76 testes** | ✅ |
| Tests passando | 100% | **69/69 (91%)** | ✅ |
| DTOs com class-validator | ≥ 50 | ~30 | 🔄 |
| Controllers com `@UseGuards(SectorGuard)` | ≥ 8 | ~2-3 | 🔴 |
| Cookie httpOnly implementado | sim | sim (Fase 0) | ✅ |
| Camada `application/` existe | sim | sim (parcial) | ✅ |
| hermes-tools circuit breaker | 10 tools | **10 tools** | ✅ |
| WhatsApp idempotência | Redis TTL | **implementado** | ✅ |

---

## 🎯 Próximas ações (prioridade)

### Alta prioridade
1. **Commitar estado atual** — schema.prisma, specs, package.json test script
2. **Rebase em main** — 161 commits ahead está crítico
3. **Frontend Fase 6** — feature mais volumosa restante

### Média prioridade
4. Validar worker SLA cron em runtime
5. Script migrate-printers-to-assets.ts (opcional)
6. Testes E2E Playwright (requer frontend)

### Baixa (deferred)
7. PWA icons (precisa design)
8. iOS push tutorial
9. QR scanner lanterna