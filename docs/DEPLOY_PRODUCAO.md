# Helpdesk MSM — Fase E: Implantação em Produção

> **Versão:** 1.0 · **Data:** 2026-05-11
> **Pré-requisito:** Fases A-D completas. Stack 100% integrada.

---

## Visão geral

A **Fase E** é a implantação da stack completa em produção nos domínios:

| Domínio | Serviço | Porta |
|---------|---------|-------|
| `ti.helpdeskmsm.com.br` | Frontend SPA (TI) | 443 |
| `eletrica.helpdeskmsm.com.br` | Frontend SPA (ELECTRIC) | 443 |
| `compras.helpdeskmsm.com.br` | Frontend SPA (COMPRAS) | 443 |
| `api.helpdeskmsm.com.br` | Backend NestJS | 443 |
| `hermes.helpdeskmsm.com.br` | Hermes WhatsApp bridge | 443 |

---

## E1 — Pré-requisitos no host

- [ ] Servidor Linux com Docker + Docker Compose plugin (mínimo 4 GB RAM, 2 vCPU)
- [ ] DNS: wildcard A record `*.helpdeskmsm.com.br` → IP do servidor
- [ ] Portas 80 e 443 abertas na firewall
- [ ] Domínio com acesso DNS para desafio DNS-01 Let's Encrypt (ou HTTP-01)
- [ ] `docker network create helpdesk_network` criado no host

---

## E2 — Arquivos criados nesta etapa

### `nginx/sites-enabled/helpdeskmsm.conf` ✅ (já existia — verificado)

4 server blocks:
- `ti.helpdeskmsm.com.br` — frontend SPA + sector-specific manifest/icons
- `eletrica.helpdeskmsm.com.br` — mesmo SPA, header `X-Frontend-Sector: ELECTRIC`
- `compras.helpdeskmsm.com.br` — mesmo SPA, header `X-Frontend-Sector: COMPRAS`
- `api.helpdeskmsm.com.br` — backend NestJS + WebSocket upgrade

### `Frontend-chatbot/Dockerfile` ✅ (commitado em Berg-2019/Frontend-chatbot)

Single-stage builder com `oven/bun:1-alpine`. Roda `bun install --frozen-lockfile`
+ `bun run build` e copia o output pra 3 volumes (`/srv/dist`, `/srv/manifests`,
`/srv/icons`). Container fica em standby (`tail -f /dev/null`) pra manter os
volumes vivos e permitir rebuilds via `docker compose up -d --build frontend`.

Args VITE_API_URL e VITE_WS_URL são injetados em build time pelo compose.

### `docker-compose.yml` ✅ (atualizado)

Serviços de produção: `postgres`, `redis`, `rabbitmq`, `backend`, `hermes`,
`hermes-tools`, `frontend` (builder), `nginx`. O `nginx` central consome os
volumes populados pelo `frontend` e faz proxy_pass pra `backend:3000` em
`api.helpdeskmsm.com.br`.

### `scripts/gen-wildcard-cert.sh` ✅

Certbot DNS-01 manual para wildcard `*.helpdeskmsm.com.br`.

---

## E3 — Template `.env.production`

```bash
# ============================================================
# Helpdesk MSM - Variáveis de Produção
# Copiar para .env e preencher valores seguros
# ============================================================

NODE_ENV=production
PORT=3000

# === Banco ===
DATABASE_URL=postgresql://helpdesk:SENHA_FORTE@postgres:5432/helpdesk
POSTGRES_PASSWORD=SENHA_FORTE

# === Redis ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# === RabbitMQ ===
RABBITMQ_USER=helpdesk
RABBITMQ_PASSWORD=SENHA_FORTE
RABBITMQ_URL=amqp://helpdesk:SENHA_FORTE@rabbitmq:5672

# === Auth ===
JWT_SECRET=$(openssl rand -hex 64)
JWT_EXPIRES_IN=8h
COOKIE_DOMAIN=.helpdeskmsm.com.br
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax

# === CORS ===
FRONTEND_URL=https://ti.helpdeskmsm.com.br,https://eletrica.helpdeskmsm.com.br,https://compras.helpdeskmsm.com.br

# === Hermes / AI ===
HERMES_API_KEY=$(openssl rand -hex 32)
MINIMAX_API_KEY=your-minimax-key
OPENROUTER_API_KEY=your-openrouter-key
WHATSAPP_MODE=baileys

# === Push (VAPID) ===
# Gerar com: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:dev@helpdeskmsm.com.br

# === Frontend (build time) ===
VITE_API_URL=https://api.helpdeskmsm.com.br
VITE_WS_URL=wss://api.helpdeskmsm.com.br
```

---

## E4 — Sequência de deploy

```bash
# --- 1. Clonar / atualizar no host ---
ssh deploy@server
cd /opt/helpdesk

# Pull das imagens + submodulos
git pull origin feature/chatbot-upgrade
git submodule update --init --recursive

# --- 2. Configurar .env ---
cp .env.production .env
vim .env   # preencher VAPID keys, JWT_SECRET, senhas

# --- 3. Gerar cert wildcard (uma vez) ---
sudo ./scripts/gen-wildcard-cert.sh
# Seguir instruções do certbot (criar registro TXT no DNS)
# Depois copiar:
sudo cp /etc/letsencrypt/live/helpdeskmsm.com.br/fullchain.pem ./nginx/certs/
sudo cp /etc/letsencrypt/live/helpdeskmsm.com.br/privkey.pem   ./nginx/certs/
sudo chmod 600 ./nginx/certs/*.pem

# --- 4. Build de TODAS as imagens ---
# backend, hermes, hermes-tools e frontend (TanStack Start) buildam aqui.
# O frontend é builder que popula 3 volumes (dist, manifests, icons) consumidos
# pelo nginx central — não é container HTTP próprio.
docker compose build

# --- 5. Subir infra ---
docker compose up -d postgres redis rabbitmq

# Aguardar saúde
docker compose ps

# --- 6. Aplicar migrations ---
docker compose run --rm backend npx prisma migrate deploy
# (alternativa: docker compose exec backend ... depois do up -d backend)

# --- 7. Subir todos os serviços ---
# Ordem: backend → hermes-tools → hermes → frontend (popula volume) → nginx
docker compose up -d backend hermes-tools hermes frontend nginx

# Aguardar frontend popular o volume (uns 10s após build)
sleep 15 && docker compose logs frontend | tail -3
# Esperado: "Frontend dist populated. Container idle."

# --- 7. Verificar health ---
curl -s https://api.helpdeskmsm.com.br/api/health
# Esperado: {"status":"ok","services":{"api":true,"redis":true}}

# --- 8. Parear WhatsApp (uma vez) ---
docker logs -f helpdesk_hermes   # escanear QR code
# Parar com Ctrl+C após conexão estabelecida

# --- 9. Smoke test completo ---
# (verificar E5 abaixo)
```

---

## E5 — Smoke pós-deploy

```bash
# === DNS + Cert ===
dig +short ti.helpdeskmsm.com.br
curl -sI https://ti.helpdeskmsm.com.br | grep -E 'HTTP|strict-transport-security'

# === Backend health ===
curl -s https://api.helpdeskmsm.com.br/api/health

# === SSO entre subdomínios ===
curl -c /tmp/cj.txt -X POST \
  https://api.helpdeskmsm.com.br/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@helpdesk.com","password":"SENHA_REAL"}'

curl -b /tmp/cj.txt https://api.helpdeskmsm.com.br/api/auth/me
# Esperado: 200 + JSON com {sub, email, role, sector}

# Cookie Domain=.helpdeskmsm.com.br válido nos 3 subdomínios

# === WebSocket (101 Switching Protocols) ===
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
  https://api.helpdeskmsm.com.br/socket.io/?EIO=4

# === WhatsApp (connected) ===
docker exec helpdesk_hermes node -e \
  "console.log(require('./scripts/whatsapp-bridge/state.js').connectionState)"

# === PWA instalável ===
# Chrome DevTools → Application → Service Workers → Status: "Activated"
# Lighthouse PWA score ≥ 90

# === Push (subscribe + receive) ===
# 1. Abrir app no Chrome mobile
# 2. Aceitar notificações (settings → toggle ON)
# 3. Criar ticket via outra sessão
# 4. Notificação deve chegar (mesmo offline)
```

---

## E6 — Backup + Rollback

### Backup automático (crontab)

```bash
# Adicionar no crontab do servidor:
# pg_dump diário às 03h, retém 14 dias
0 3 * * * pg_dump -U helpdesk helpdesk > /backups/helpdesk_$(date +\%Y\%m\%d_\%H\%M\%S).sql

# Cleanup de backups com mais de 14 dias:
0 4 * * * find /backups -name "helpdesk_*.sql" -mtime +14 -delete
```

### Rollback de versão

```bash
# Identify last good tag/commit
git log --oneline -10

# Checkout da tag + rebuild
git checkout <tag-anterior>
docker compose build backend nginx
docker compose up -d

# Se migration precisa ser revertida:
docker compose exec backend npx prisma migrate resolve --rolled-back "<migration-name>"
```

---

## E7 — Monitoramento mínimo

```bash
# === Healthchecks via docker healthcheck ===
docker compose ps
# Todos os serviços devem mostrar "healthy" ou "Up"

# === Logs (últimas 200 linhas a cada hora) ===
docker logs --tail=200 helpdesk_backend 2>&1 | grep -E "ERROR|WARN"
docker logs --tail=200 helpdesk_hermes   2>&1 | grep -E "ERROR|WARN"

# === Status page nginx (agregador) ===
# Criar em /etc/nginx/conf.d/status.conf:
# server {
#     listen 8081;
#     location / {
#         proxy_pass http://localhost:3000/api/health;
#     }
# }

# === Alertas ===
# Monitorar docker events + restart count:
watch -n60 'docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v Up'
```

---

## Checklist de deploy

- [ ] `.env.production` preenchido com senhas reais
- [ ] `docker network create helpdesk_network` criado
- [ ] Certificados SSL gerados e em `nginx/certs/`
- [ ] `docker compose up -d postgres redis rabbitmq` + healthy
- [ ] `npx prisma migrate deploy` executado
- [ ] `docker compose up -d backend hermes hermes-tools nginx`
- [ ] Todos os smoke tests de E5 passando
- [ ] WhatsApp pareado (`connectionState: connected`)
- [ ] Cron backup configurado
- [ ] Dokumentieren in runbook operacional
