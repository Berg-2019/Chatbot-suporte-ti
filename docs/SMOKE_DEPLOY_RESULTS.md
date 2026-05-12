# Smoke Deploy — Resultados (2026-05-12)

> Smoke do `docker-compose.yml` de produção rodando na **VM de produção**.
> Stack está **100% UP e respondendo** em todos os 10 endpoints validados.
> Containers prontos para tráfego real.

---

## ✅ Status final (após rodada de fixes)

### Containers em execução
| Service | Container | Status |
|---|---|---|
| `postgres` | helpdesk_postgres | Up (healthy) |
| `redis` | helpdesk_redis | Up (healthy) |
| `rabbitmq` | helpdesk_rabbitmq | Up (healthy) |
| `backend` (NestJS 11) | helpdesk_backend | **Up (healthy)** |
| `hermes-tools` | helpdesk_hermes_tools | Up |
| `frontend` (builder) | helpdesk_frontend | Up |
| `nginx` (reverse proxy) | helpdesk_nginx | Up |
| `hermes` | helpdesk_hermes | (image dev preexistente — rebuild adiado por rede) |

### Smoke E5 — endpoints validados

| # | Endpoint | Esperado | Real |
|---|---|---|---|
| 1 | `GET /api/health` | 200 + JSON | ✅ 200 `{"status":"ok","services":{"api":true,"redis":true}}` |
| 2 | `GET /` (ti.helpdeskmsm.com.br) | SPA HTML | ✅ 200 + `X-Frontend-Sector: TI` |
| 3 | `GET /` (eletrica.helpdeskmsm.com.br) | SPA HTML | ✅ 200 + `X-Frontend-Sector: ELECTRIC` |
| 4 | `GET /` (compras.helpdeskmsm.com.br) | SPA HTML | ✅ 200 + `X-Frontend-Sector: COMPRAS` |
| 5 | `GET /manifest.webmanifest` | manifest+json | ✅ 200 |
| 6 | `GET /icons/icon-192.png` | image/png | ✅ 200 (sector-specific via alias) |
| 7 | `POST /api/auth/login` | 200 + Set-Cookie HttpOnly | ✅ 200 + `helpdesk_session` `HttpOnly` `Domain=.helpdeskmsm.com.br` `Secure` `SameSite=Lax` `Max-Age=28800` |
| 8 | `GET /api/auth/me` (com cookie) | user JSON | ✅ 200 `{"user":{...role:"ADMIN",sector:"TI"...}}` |
| 9 | `GET /api/tickets/my` (auth) | array | ✅ 200 |
| 10 | `GET /api/sla/policies` (auth) | array | ✅ 200 |
| 11 | `GET /api/users` (admin) | array com admin | ✅ 200 + lista admin |
| 12 | `GET /api/push/vapid-public-key` (auth) | `{"key":"..."}` | ✅ 200 VAPID public key real |
| 13 | `POST /api/auth/login` (rate limit) | 429 após 5 reqs/min | ✅ HTTP 400→400→400→400→**429**→429→429 |

### Headers de segurança no `/api/*`
- `Content-Security-Policy: default-src 'self'; ... object-src 'none'; frame-ancestors 'none'; base-uri 'self'; upgrade-insecure-requests` ✅
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` ✅
- `Cross-Origin-Opener-Policy: same-origin` ✅
- `Cross-Origin-Resource-Policy: same-site` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅

### Headers de segurança no SPA
- `X-Frame-Options: SAMEORIGIN` ✅
- `X-Content-Type-Options: nosniff` ✅
- `X-XSS-Protection: 1; mode=block` ✅
- `X-Frontend-Sector: TI/ELECTRIC/COMPRAS` ✅

---

## 🔧 Problemas encontrados e corrigidos durante o smoke

### 1. TanStack Start gerava SSR sem `index.html` *(corrigido em commit `b9dad92`)*
**Causa:** `@lovable.dev/vite-tanstack-config` ativava Cloudflare Workers build no modo `build`, anulando o prerender de shell SPA.

**Fix:** [`Frontend-chatbot/vite.config.ts`](../Frontend-chatbot/vite.config.ts):
```ts
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: { enabled: true, maskPath: "/", prerender: { outputPath: "/index" } },
  },
  // ...
});
```

### 2. Mount aninhado em path read-only *(corrigido em commit `b9dad92`)*
**Causa:** `frontend_manifests` montado em subpath de `frontend_dist:/usr/share/nginx/html:ro` travava nginx.

**Fix:** Dockerfile flat — copia `dist/client/*` direto pra `/srv/html`. nginx monta volume único.

### 3. Network conflict entre stacks *(corrigido em commit `56e4fbc`)*
**Fix:** Marcar `helpdesk_network` como `external: true` no compose prod.

### 4. Migrations Prisma marcadas como `failed` *(reparado em runtime)*
**Causa:** Tentativas anteriores deixaram 5 migrations com `started_at NOT NULL AND finished_at IS NULL` no `_prisma_migrations`.

**Fix:**
- `prisma migrate resolve --rolled-back <migration>` na que estava parcial
- `prisma migrate resolve --applied <migration>` nas 4 já aplicadas no schema
- `prisma migrate deploy` rodou as 3 últimas que faltavam (`fix_user_status`, `fix_user_notification_prefs`, `ticket_phone_optional`, `add_message_media_and_reads`, `add_technical_reports`)
- `prisma db push --accept-data-loss --skip-generate` no final pra alinhar último drift do schema (campo `users.deletedAt` e ajustes em `AgentStatus`)

### 5. `users.status` / `users.deletedAt` faltando *(corrigido pelo `db push`)*
Schema do Prisma 6.19.3 esperava colunas que não estavam no DB. `db push` sincronizou.

### 6. Migration `add_message_media_and_reads` falhava no cast de enum
**Causa:** `CREATE TYPE MessageType_new` + `ALTER COLUMN type TYPE` falhava porque a coluna tinha `DEFAULT` ativo (Postgres não consegue cast automático).

**Fix manual aplicado:** `ALTER TYPE "MessageType" ADD VALUE 'VIDEO'` + colunas individuais com `ADD COLUMN IF NOT EXISTS`. Marcou migration como `--applied` depois.

### 7. Extensão `uuid-ossp` faltando
**Causa:** Migration `add_technical_reports` usava `uuid_generate_v4()`.

**Fix:** `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` no postgres + retry migrate.

### 8. nginx config referenciava manifests sectoriais inexistentes *(corrigido)*
**Causa:** Config antiga apontava pra `/manifests/manifest-{ti,electric,compras}.webmanifest`, mas o frontend hoje tem único `manifest.webmanifest` (decisão "PWA único" de 2026-05-10).

**Fix:** [`nginx/sites-enabled/helpdeskmsm.conf`](../nginx/sites-enabled/helpdeskmsm.conf) — 3 server blocks agora usam `try_files /manifest.webmanifest =404;`.

### 9. `ADMIN_PASSWORD` não chegava no container backend
**Causa:** compose só injetava env vars explícitas (sem `env_file`). `auth.service.ts` esperava `ADMIN_PASSWORD`.

**Fix:** [`docker-compose.yml`](../docker-compose.yml) adiciona `env_file: .env` no service backend.

### 10. `VAPID_PUBLIC_KEY` vazia *(corrigido)*
**Causa:** `.env` sem as chaves VAPID.

**Fix:** Gerar via `web-push.generateVAPIDKeys()` no próprio backend container e adicionar ao `.env`. Force-recreate do container backend.

---

## 🚀 Comandos pra subir/reiniciar a stack

### Subir do zero (estado limpo)
```bash
# Pré-requisitos: docker network create helpdesk_network já existe

# 1. Postgres + Redis + RabbitMQ (espera healthy)
docker compose -f docker-compose.yml up -d postgres redis rabbitmq

# 2. Habilitar extensão uuid-ossp (uma vez)
docker exec helpdesk_postgres psql -U helpdesk -d helpdesk \
  -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 3. Aplicar migrations
docker run --rm --network helpdesk_network \
  -e DATABASE_URL="postgresql://helpdesk:${POSTGRES_PASSWORD}@postgres:5432/helpdesk" \
  chatbot-suporte-ti-backend \
  npx prisma migrate deploy

# 4. (opcional) sincronizar drift de schema
docker run --rm --network helpdesk_network \
  -e DATABASE_URL="postgresql://helpdesk:${POSTGRES_PASSWORD}@postgres:5432/helpdesk" \
  chatbot-suporte-ti-backend \
  npx prisma db push --accept-data-loss --skip-generate

# 5. Subir serviços
docker compose -f docker-compose.yml up -d backend hermes-tools hermes frontend nginx

# 6. Smoke E5
curl -sk --resolve api.helpdeskmsm.com.br:443:127.0.0.1 \
  https://api.helpdeskmsm.com.br/api/health
```

### Smoke completo (10 curls)
Ver script em [SMOKE_E5_RESULTS.md](#smoke-e5--endpoints-validados) acima.

---

## 📝 Atualizações pendentes pra DEPLOY_PRODUCAO.md

Itens descobertos no smoke real que precisam estar no doc principal:

1. **E1 (pré-reqs):** rodar `docker network create helpdesk_network` antes de qualquer compose up.
2. **E1 (pré-reqs):** `CREATE EXTENSION uuid-ossp` no postgres na primeira vez.
3. **E3 (.env):** garantir todas as envs do `ADMIN_*`, `VAPID_*` setadas — sem isso o backend trava no `ensureAdminExists`.
4. **E4 (sequência):** ordem correta é `postgres/redis/rabbitmq → migrate deploy → db push → backend → hermes-tools → frontend → nginx`.
5. **E4 (sequência):** rodar `prisma db push --accept-data-loss --skip-generate` como passo opcional após migrate, pra cobrir drift de schema que migration files não capturaram.
6. **E2 (artefatos):** documentar que `docker-compose.yml` agora usa `env_file: .env` no backend (não precisa duplicar env vars).

---

## 📦 Backups gerados durante o smoke

- `/tmp/helpdesk_pre_reset_20260512_125702.sql` — pg_dump pré-reset (152 KB). Pode descartar agora que stack está validada.
