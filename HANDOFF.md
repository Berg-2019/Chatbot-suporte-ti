# HANDOFF — estado da stack e próximos passos

> **Para o próximo agente / dev:** este é o ponto de entrada. Leia antes de tocar em qualquer coisa.
> **Data do snapshot:** 2026-05-12 · **Branch:** `feature/chatbot-upgrade` no Chatbot · `main` no Frontend-chatbot e fork Hermes.

---

## 🎯 Onde estamos

Sistema **rodando 100% E2E na VM de produção** (smoke deploy verde — 13/13 endpoints validados). Mas o **Hermes/WhatsApp ainda não está em produção real** — o que está rodando é dev/teste. A integração frontend↔backend está validada via curl; falta exercitar via UI real e UI mobile.

### Containers ativos na VM agora (checar com `docker ps`)

| Container | Origem | Status esperado |
|---|---|---|
| `helpdesk_postgres` | docker-compose.dev.yml (volume `helpdesk_postgres_dev`) | healthy |
| `helpdesk_redis` | dev | healthy |
| `helpdesk_rabbitmq` | dev | healthy |
| `helpdesk_backend` | **docker-compose.yml (prod)** — NestJS 11 | healthy |
| `helpdesk_hermes_tools` | docker-compose.yml | up |
| `helpdesk_frontend` | docker-compose.yml — builder, popula volume `frontend_dist` | up |
| `helpdesk_nginx` | docker-compose.yml — 4 vhosts SSL self-signed | up |
| `helpdesk_intent` | dev | healthy |
| `helpdesk_hermes` | NÃO está no compose prod (image existe) | parado |

**Importante:** dev e prod COMPARTILHAM postgres/redis/rabbitmq via rede `helpdesk_network` (external). Pra subir uma prod isolada num host limpo, ver [docs/DEPLOY_PRODUCAO.md](docs/DEPLOY_PRODUCAO.md).

---

## ✅ Validações de smoke (todas verdes)

Comando rápido pra revalidar:
```bash
# requer cookie de admin — login antes
curl -sk -c /tmp/cj.txt --resolve api.helpdeskmsm.com.br:443:127.0.0.1 \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$(grep ^ADMIN_EMAIL= .env | cut -d= -f2-)\",\"password\":\"$(grep ^ADMIN_PASSWORD= .env | cut -d= -f2-)\"}" \
  https://api.helpdeskmsm.com.br/api/auth/login > /dev/null

for ep in /api/health /api/auth/me /api/tickets/my /api/sla/policies /api/users /api/push/vapid-public-key; do
  echo "$ep: $(curl -sk -b /tmp/cj.txt --resolve api.helpdeskmsm.com.br:443:127.0.0.1 -o /dev/null -w '%{http_code}' https://api.helpdeskmsm.com.br$ep)"
done

for h in ti eletrica compras; do
  echo "SPA $h: $(curl -sk --resolve $h.helpdeskmsm.com.br:443:127.0.0.1 -o /dev/null -w '%{http_code}' https://$h.helpdeskmsm.com.br/)"
done
```

Smoke completo + headers de segurança documentados em [docs/SMOKE_DEPLOY_RESULTS.md](docs/SMOKE_DEPLOY_RESULTS.md).

---

## 📦 O que foi feito nesta sessão (em ordem cronológica)

| # | Commit Chatbot | O quê |
|---|---|---|
| 1 | `47c9596` | NestJS 10 → 11 (24 → 3 vulnerabilidades) |
| 2 | `56e4fbc` | docker-compose network external + volumes simplificados |
| 3 | `7ebfb52` | `POST /users/:id/reset-password` |
| 4 | `6059ab3` | Smoke deploy verde — env_file, healthcheck `/api/health`, CSP, manifest fix |
| 5 | `f7a5514` | Bump SHA Hermes (merge upstream NousResearch 2768 commits) |

| Commit Frontend-chatbot | O quê |
|---|---|
| `b9dad92` | vite `cloudflare: false` + `tanstackStart.spa.enabled` + Dockerfile flat |
| `2b4bb69` | Migração final: `userStore`/`reports`/`audit` → services REST + tipos puros |
| `5eb65f7` | Suite Playwright E2E (3 specs, 12 testes) |
| `fdc7bc8` | npm audit fix (0 vulnerabilidades) |
| `c0f3282` | Fix 6 erros TS + X-Request-ID no axios |

| Commit Hermes (fork) | O quê |
|---|---|
| `dc6fb02a8` | Merge upstream/main NousResearch — 2768 commits absorvidos preservando nossos 3 |

---

## 🚧 Pendentes priorizados

### Alta — antes de tráfego real

1. **Cert wildcard Let's Encrypt** (atualmente self-signed em `nginx/certs/`):
   ```bash
   sudo bash scripts/gen-wildcard-cert.sh
   # seguir prompt DNS-01 do certbot; criar TXT record _acme-challenge
   sudo cp /etc/letsencrypt/live/helpdeskmsm.com.br/fullchain.pem nginx/certs/wildcard.helpdeskmsm.com.br.crt
   sudo cp /etc/letsencrypt/live/helpdeskmsm.com.br/privkey.pem   nginx/certs/wildcard.helpdeskmsm.com.br.key
   docker exec helpdesk_nginx nginx -s reload
   ```

2. **DNS wildcard** `*.helpdeskmsm.com.br` → IP da VM (verificar com `dig +short ti.helpdeskmsm.com.br`).

3. **Smoke em device mobile real**: instalar PWA no celular (Chrome/Safari), validar push notification, foto via câmera, login SSO entre subdomínios. Suite Playwright cobre desktop + mobile chromium mas não substitui device físico.

4. **Rebuild do Hermes pra pegar o upstream merge** (image atual é pré-merge):
   ```bash
   docker compose -f docker-compose.yml build hermes  # ~5-10 min
   docker compose -f docker-compose.yml up -d --force-recreate hermes
   docker logs -f helpdesk_hermes  # parear QR de novo se sessão WhatsApp invalidar
   ```
   Validar: bridge.js voice bubbles (mp3→ogg conversion), stranger reject, message splitting.

### Média — qualidade

5. **Dialog "Novo usuário" em `/admin/users`**: backend já aceita `POST /users` (admin only); UI tem só botão "Novo" sem `onClick`. Implementar dialog idêntico ao de `dev.index.tsx` mas dentro do layout authed.

6. **C6 push expandido — eventos faltantes**: já dispara em ticket create/status/message (commit `a26ecf6`). Falta: SLA breach iminente, escalation, asset assignment.

7. **Imap/utf7 dívida de segurança** (3 high audit): substituir `imap` por `imapflow` em `backend/src/infrastructure/email/email-ingestion.service.ts` ou deixar como tá (módulo é opcional, desabilitado em runtime quando `EMAIL_INGESTION_*` não setado).

### Baixa — débito técnico

8. **20 módulos do backend sem UI no frontend**: Parts, Printers, Reservations, CSAT, Automation, Labels, Bot Variables, Macros, etc. Listados em [IMPLEMENTATION_CHECKLIST.md §13](IMPLEMENTATION_CHECKLIST.md).

9. **5 controllers ainda injetam PrismaService direto** (violação Clean Arch v2): `auto-assignment`, `automation`, `admin`, `chat`, `team-chat`. Refatorar pra passar via service/use-case.

10. **GLPI legacy schema** — 6 colunas ainda no Prisma (`User.glpiUserId`, `glpiGroupId`, `Ticket.glpiId+index`, `Message.glpiId`, `StockItem.glpiAssetId`). Migration drop adiada pós-merge develop/main.

---

## 🧠 Decisões importantes (não revisitar sem novo plano)

- **PWA único**: tema/abas vêm do JWT (`user.sector`), não do host. 1 manifest, 3 subdomínios servem o mesmo SPA. Decisão 2026-05-10.
- **Hermes Agent**: única integração WhatsApp (sem bot legado). Bridge HTTP em `helpdesk_hermes_tools:3003`.
- **Sem GLPI**: CMDB nativo (Asset/AssetAssignment/License/LicenseAssignment) + SLA + PurchaseRequests.
- **NestJS 11 sobre Nest 10**: zero código mudou, 87% das vulnerabilidades resolvidas.
- **Bridge Hermes Docker-aware**: nosso fork diverge do upstream em `_ACCEPTED_HOST_VALUES` (`'hermes'` adicionado) e `bind 0.0.0.0`. Upstream reforçou loopback-only por GHSA-ppp5-vxwm-4cf7 (DNS rebinding). Trade-off consciente — rodamos em rede Docker isolada.
- **Cookie SSO**: `helpdesk_session` `HttpOnly` `Domain=.helpdeskmsm.com.br` `Secure` `SameSite=Lax` `Max-Age=28800`. Compartilhado entre ti/eletrica/compras subdomínios.

---

## ⚠️ Armadilhas conhecidas (CRUCIAL)

### 1. `git add -A` no Chatbot-suporte-ti
Tem 1 submódulo (`hermes-agent`). Adicionar tudo cego pode bumper o SHA sem você notar. Use `git add arquivo.ts` ou `git add -A -- ':!hermes-agent/'`.

### 2. `backend/dist/` root-owned
Container Docker cria como root, depois `tsc` local falha com `EACCES`. Fix: `sudo chown -R dev:dev backend/dist`.

### 3. `backend/uploads/attachments/*.webm` root-owned
Mesma situação. Antes de git operations nesse path: `sudo git restore backend/uploads/attachments/`.

### 4. Migrations Prisma marcadas como "failed" no DB
Acontece quando uma migration parou no meio. Tratamento padrão:
```bash
PASS=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
# se schema realmente foi aplicado:
docker run --rm --network helpdesk_network -e DATABASE_URL="postgresql://helpdesk:${PASS}@postgres:5432/helpdesk" \
  chatbot-suporte-ti-backend npx prisma migrate resolve --applied <migration_name>
# senão:
docker run --rm --network helpdesk_network -e DATABASE_URL="postgresql://helpdesk:${PASS}@postgres:5432/helpdesk" \
  chatbot-suporte-ti-backend npx prisma migrate resolve --rolled-back <migration_name>
# depois sincronizar:
docker run --rm --network helpdesk_network -e DATABASE_URL="postgresql://helpdesk:${PASS}@postgres:5432/helpdesk" \
  chatbot-suporte-ti-backend npx prisma db push --accept-data-loss --skip-generate
```

### 5. Extension `uuid-ossp` precisa estar habilitada
Antes de rodar `prisma migrate deploy` numa DB fresh:
```bash
docker exec helpdesk_postgres psql -U helpdesk -d helpdesk -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 6. Backend prod precisa `env_file: .env`
`AuthService.ensureAdminExists` lê `ADMIN_PASSWORD` direto de `process.env`. Se você adicionar env vars novas no .env, **`docker compose up -d --force-recreate backend`** (restart simples não recarrega env_file).

### 7. Migration `add_message_media_and_reads` tem bug de cast
`ALTER COLUMN type TYPE MessageType_new` falha porque a coluna tem `DEFAULT`. Workaround manual:
```sql
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'VIDEO';
-- depois marcar como applied via prisma migrate resolve
```

### 8. nginx self-signed cert (smoke local)
`nginx/certs/wildcard.helpdeskmsm.com.br.{crt,key}` é self-signed gerado por `openssl req -x509`. Browsers vão reclamar — só pra smoke. Em prod real, gerar via Let's Encrypt DNS-01.

### 9. Frontend Dockerfile usa `outputPath: "/index"`
Não `"/"` (gera `.html` sem nome). E `cloudflare: false` é obrigatório no `vite.config.ts` ou o build SSR sobrescreve o SPA shell.

### 10. Rede `helpdesk_network` deve existir ANTES de qualquer compose up
```bash
docker network create helpdesk_network 2>/dev/null || true
```

---

## 🛠️ Comandos comuns

```bash
# subir prod completo (após git pull num host limpo)
cd /home/dev/Projetos/Chatbot-suporte-ti
docker network create helpdesk_network 2>/dev/null || true
docker compose -f docker-compose.yml up -d postgres redis rabbitmq
sleep 10
docker exec helpdesk_postgres psql -U helpdesk -d helpdesk -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
docker compose -f docker-compose.yml build  # primeira vez
docker compose -f docker-compose.yml run --rm backend npx prisma migrate deploy
docker compose -f docker-compose.yml run --rm backend npx prisma db push --accept-data-loss --skip-generate  # se houver drift
docker compose -f docker-compose.yml up -d backend hermes-tools hermes frontend nginx

# logs do que importa
docker logs -f helpdesk_backend
docker logs -f helpdesk_hermes      # QR code WhatsApp
docker logs -f helpdesk_nginx

# parar tudo
docker compose -f docker-compose.yml down

# rebuilds dirigidos
docker compose -f docker-compose.yml build backend  # 30-60s
docker compose -f docker-compose.yml build frontend # 20-30s
docker compose -f docker-compose.yml build hermes   # 5-10 min

# frontend dev local (sem docker)
cd Frontend-chatbot
bun install
bun run dev:ti  # 5173

# tests
cd backend && npm test               # 61 backend
cd Frontend-chatbot && npm run test:e2e   # 12 playwright (precisa stack rodando + seed)

# tsc check
cd backend && npx tsc --noEmit
cd Frontend-chatbot && npx tsc --noEmit
```

---

## 🗂️ Arquivos críticos por responsabilidade

| Arquivo | Pra quê |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Instruções gerais pra agentes |
| [AGENTS.md](AGENTS.md) | Armadilhas conhecidas (este HANDOFF amplia) |
| [IMPLEMENTATION_PLAN_V3.md](IMPLEMENTATION_PLAN_V3.md) | Plano vigente |
| [docs/PLANO_FRONTEND_INTEGRACAO_E_IMPLANTACAO.md](docs/PLANO_FRONTEND_INTEGRACAO_E_IMPLANTACAO.md) | Plano detalhado de integração frontend↔backend (Fase 6) |
| [docs/SMOKE_DEPLOY_RESULTS.md](docs/SMOKE_DEPLOY_RESULTS.md) | Resultado do smoke deploy real (esta sessão) |
| [docs/DEPLOY_PRODUCAO.md](docs/DEPLOY_PRODUCAO.md) | Checklist de deploy real |
| `docker-compose.yml` | Stack de produção (NestJS 11, frontend builder, nginx) |
| `docker-compose.dev.yml` | Stack de desenvolvimento |
| `nginx/sites-enabled/helpdeskmsm.conf` | 4 vhosts (ti/eletrica/compras/api) com WS upgrade |
| `Frontend-chatbot/vite.config.ts` | Config SPA + PWA workbox |
| `Frontend-chatbot/Dockerfile` | Builder flat (popula `/srv/html`) |
| `Frontend-chatbot/e2e/` | Playwright suite (12 testes) |
| `Frontend-chatbot/src/lib/api.ts` | Cliente HTTP com X-Request-ID + withCredentials |
| `Frontend-chatbot/src/hooks/useSocket.ts` | WebSocket helper (3 hooks) |
| `backend/prisma/schema.prisma` | Fonte da verdade do schema |
| `backend/src/main.ts` | CSP estrita + HSTS + CORS + helmet |
| `backend/src/app.module.ts` | ThrottlerModule (60 req/min, 5 em login) |

---

## 📊 Métricas atuais

| Métrica | Valor |
|---|---|
| Backend NestJS | v11.1.19 |
| Frontend stack | TanStack Start + Bun + React 19 + Tailwind 4 |
| Hermes fork | `dc6fb02a8` (synced com upstream NousResearch 2768 commits, 3 commits nossos) |
| Backend tests | 61/61 passando |
| Frontend tests | 12 Playwright (precisa stack rodando) |
| tsc --noEmit | 0 erros (backend + frontend) |
| npm audit prod high | 3 (todos em `imap → utf7 → semver`, deps não-mantidas) |
| Endpoints REST validados | 13/13 |
| Migrations Prisma | 24 |
| Rate limit `/auth/login` | 5 req/min |
| Cookie TTL | 8h |
| Vulnerabilities resolvidas nesta sessão | 21 (24 → 3) |

---

## 🔐 Credenciais de teste (admin)

```bash
grep -E "^(ADMIN_EMAIL|ADMIN_PASSWORD)=" .env
```

JWT no payload: `{sub, email, role, sector, iat, exp}`. Roles: `ADMIN`, `ADMIN_TI`, `ADMIN_ELECTRIC`, `ADMIN_COMPRAS`, `AGENT`. Sectors: `TI`, `ELECTRIC`, `COMPRAS`.

---

## 💡 Se aparecer um agente novo

1. Leia este HANDOFF primeiro
2. Depois CLAUDE.md + IMPLEMENTATION_PLAN_V3.md
3. Antes de mudar qualquer coisa, rode `docker ps` + smoke acima pra confirmar estado
4. Para mudanças de schema/migration: backup primeiro com `docker exec helpdesk_postgres pg_dump -U helpdesk helpdesk > /tmp/bkp_$(date +%s).sql`
5. Para mudanças no compose prod: `docker compose -f docker-compose.yml config` valida antes
6. Para mudanças no submódulo Hermes: lembre que upstream tem GHSA-ppp5-vxwm-4cf7 que afeta bridge.js — nosso fork divergiu intencionalmente

---

**Boa sorte. Stack está sólida — não tem nada quebrado nesta data.**
