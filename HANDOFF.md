# HANDOFF.md — Chatbot-suporte-ti

> 🚨 **LEIA PRIMEIRO ESTE ARQUIVO** antes de qualquer ação neste repo.
> Atualizado: 2026-06-02 · Branch: `feature/chatbot-upgrade`

---

## 🔴 MUDANÇA ARQUITETURAL EM ANDAMENTO (2026-06-02)

### Substituindo Hermes Agent por WhatsApp Bot nativo

**Decisão:** Remover o Hermes Agent (Python gateway + Node.js bridge + 2 containers extras) e substituir por um **WhatsApp bot Baileys rodando dentro do NestJS** (mesmo processo, 0 containers extras).

**Plano completo:** [`/home/dev/.claude/plans/parsed-growing-glacier.md`](.claude/plans/parsed-growing-glacier.md)

**Motivação:** 10 bugs em 1 sessão causados por cola entre camadas; complexidade desproporcional (780K linhas de framework Python + LLM probabilístico para 5 ações determinísticas).

### Progresso das Etapas

| Etapa | Status | Commit | Descrição |
|-------|--------|--------|-----------|
| **1. BaileysService** | ✅ Done | `e4189f7` | Conexão Baileys dentro do NestJS, QR, endpoints REST, consume outgoing_messages |
| **2. FlowService** | 🔲 Pendente | — | State machine + classificação via IntentService (MiniMax) |
| **3. Integração** | 🔲 Pendente | — | RabbitMQ, ContactService, MessagesService, AlertService, Socket.IO |
| **4. IA conversacional** | 🔲 Pendente | — | Respostas naturais MiniMax quando confidence < 0.6 |
| **5. CSAT + Ranking** | 🔲 Pendente | — | Pesquisa satisfação pós-ticket + ranking de agentes |
| **6. Console DEV** | 🔲 Pendente | — | Aba WhatsApp (QR/status), Satisfação, Ranking no frontend /dev |
| **7. Limpeza** | 🔲 Pendente | — | Remover Hermes, hermes-tools, hermes-agent do compose e código |

### Arquivos criados (Etapa 1)

```
backend/src/infrastructure/whatsapp/
├── whatsapp.module.ts        # NestJS module
├── baileys.service.ts        # Conexão Baileys, QR, send/receive, consume outgoing
├── whatsapp.controller.ts    # GET /api/whatsapp/status, /qr, POST /disconnect, /restart
├── whatsapp.constants.ts     # Estados, mensagens template, config
└── whatsapp.types.ts         # FlowState enum, ConversationSession, WhatsAppStatus
```

### O que NÃO tocar até Etapa 7

- **NÃO deletar** `hermes-agent/`, `hermes-integration/`, Hermes containers — ainda funcionam em paralelo
- **NÃO deletar** `backend/src/presentation/controllers/hermes/` — o HermesModule ainda está registrado
- O WhatsAppModule coexiste com o HermesModule até a limpeza final

### Próxima ação (Etapa 2)

Criar `flow.service.ts` em `backend/src/infrastructure/whatsapp/` com:
1. State machine (FlowState enum já definido em whatsapp.types.ts)
2. Sessão via Redis (prefix `wa:session:`)
3. Integrar `IntentService.classify()` para classificar intenção
4. Handlers para cada estado (GREETING, COLLECT_PROBLEM, CONFIRM, etc.)
5. Registrar callback `BaileysService.onMessage()` no FlowService

### Provider IA

- **Primário:** MiniMax (MiniMax-M2.5) — key em `MINIMAX_API_KEY`, endpoint OpenAI-compatible
- **Fallback:** Ollama local (`qwen2.5:3b`) → GLM-4 (se GLM_API_KEY configurada)
- **Serviço:** `IntentService` em `backend/src/presentation/controllers/intent/intent.service.ts`
- **9 intenções:** abrir_ticket_ti, abrir_ticket_eletrica, reservar_equipamento, consultar_faq, consultar_ticket, falar_tecnico, saudacao, avaliar_atendimento, outro

## 🆕 Mudança de arquitetura 2026-05-12 (tarde)

**1 domínio único** — Lovable entregou `SectorThemeSync` que aplica `data-sector` + `theme-color` a partir do JWT (`useAuth().sector`). Os 3 subdomínios `ti./eletrica./compras.helpdeskmsm.com.br` **não são mais usados**. Setor é decidido pelo login.

Implicações já aplicadas:
- `nginx/sites-enabled/helpdeskmsm.conf`: 1 vhost HTTP default (não SSL, não multi-host). Servir SPA + `/api` proxy.
- `docker-compose.yml` (nginx service): só porta 80, sem mount de certs.
- Backend: `FRONTEND_URL=http://localhost,...,http://nginx` (origins locais; SSL fica no proxy reverso EXTERNO).
- Backend: `COOKIE_SECURE=false`, `COOKIE_DOMAIN=` vazio (proxy externo cuida disso em prod).
- Frontend build args: `VITE_API_URL=/api` (path relativo, mesmo origin).
- Smoke `http://localhost/` → 200 SPA, `http://localhost/api/health` → 200, login + cookie OK.

**Proxy reverso externo** (Nginx Proxy Manager, Traefik, Caddy ou nginx upstream gerenciado) é responsável por:
- Terminar SSL (Let's Encrypt etc)
- Roteamento de domínio público → container `nginx:80`
- HSTS / forçar HTTPS

O nginx INTERNO do compose é só roteador local. Em produção real, basta apontar o proxy externo pra `http://<host>:80` (ou container `nginx` na mesma rede docker).

---

## Snapshot status: ✅ stack UP, smoke single-domain verde, integração Lovable absorvida

---

## Como confirmar que a stack está no ar (single domain)

```bash
# 1. Backend health via nginx interno
curl -s http://localhost/api/health
# Esperado: {"status":"ok","services":{"api":true,"redis":true}}

# 2. Todos os 6 endpoints críticos (cookie admin@helpdesk.com / password123)
COOKIE=$(curl -s -c /tmp/hc.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@helpdesk.com","password":"admin123"}' | \
  grep -oP '"token"\s*:\s*"\K[^"]+')
TOKEN=$(grep jwt /tmp/hc.txt | awk '{print $7}')

for ep in /tickets/my /sla/policies /push/vapid-public-key /ai/suggestions/ticket-1 /assets /purchase-requests; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $COOKIE" \
    http://localhost:3000/api$ep)
  echo "$ep → $CODE"
done
# Esperado: 200 ou 401 (token exp), nenhum 404

# 3. Frontend TI (porta 5173 — bun dev)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
# Esperado: 200

# 4. Frontend Electric (5174)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5174/
# Esperado: 200

# 5. Frontend Compras (5175)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/
# Esperado: 200

# 6. Tests unitários (61/61 passando)
cd backend && npm run test 2>&1 | tail -5
# Esperado: Test Suites: 5 passed, Tests: 61 passed
```

---

## Containers ativos (确认)

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Esperado:**
| Nomes | Status |
|-------|--------|
| `helpdesk_postgres` | Up (health: postgres) |
| `helpdesk_redis` | Up (health: redis) |
| `helpdesk_rabbitmq` | Up (health: rabbitmq-diagnostics) |
| `helpdesk_backend` | Up (port 3000) |
| `helpdesk_hermes` | Up (WhatsApp pareado) |
| `helpdesk_hermes-tools` | Up (port 3003, 10 tools) |

**Se algum não está UP:**
```bash
docker compose -f docker-compose.dev.yml up -d <servico>
docker compose -f docker-compose.dev.yml logs -f <servico>
```

---

## Histórico de commits desta sessão (2026-05-12)

### Backend (Fase A — 2026-05-11, commit `81e95eb`)
```
feat: fecha gaps do backend para integração com Frontend-chatbot (Fase A)
  + GET /tickets/my (server-side filter por sector + assignedToId)
  + GET /tickets/:id/history (AuditLog + Message join)
  + GET /sla/policies + GET /sla/dashboard
  + GET /push/vapid-public-key
  + GET /ai/suggestions/:ticketId (alias reply-suggestions)
  + POST /tickets/:id/notes (ChatService.sendMessage isInternal=true)
  + WS: JWT cookie auth + CORS allowlist + sector guard
  + @Throttle 5 req/min em POST /auth/login
```

### Frontend (Fase B — commits `dcbc070` + 6 commits de B1-B11)
```
chore(repo): substitui frontend antigo (profile-driven-app) pelo novo (Frontend-chatbot)
  - Submódulo removido, Frontend-chatbot/ clonado na raiz
  - 0 mocks, build OK, 61/61 tests backend passando

feat(frontend): socket.io-client real com cookie JWT (B2)
feat(frontend): devLogin() em DEV, DEMO_USERS removido (B6)
feat(frontend): SEED=[] (vazio), mockLoans removido (B7-B11)
```

### Frontend (Fase C — PWA + Push)
```
feat(frontend): vite-plugin-pwa + workbox runtime caching (C1)
feat(frontend): usePushNotifications hook + settings toggle (C3+C4)
feat(frontend): InstallPwaPrompt component (C5)
```

### Backend (Fase D — Hardening)
```
feat: adiciona TraceIdInterceptor com AsyncLocalStorage (D4)
  - X-Request-ID em toda response
  - Respeita header do cliente ou gera uuid
  - Sem breaking changes, zero deps novas
```

### Docs
```
docs: adiciona PLANO_FRONTEND_INTEGRACAO_E_IMPLANTACAO
docs: marca Fase C completa em IMPLEMENTATION_CHECKLIST.md
docs: marca Fase D completa em IMPLEMENTATION_CHECKLIST.md
docs: atualiza PLANO com estado Final — Fases A-D completas
docs: atualiza estado — Fase E com artefatos prontos
feat: adiciona artefatos Fase E (Dockerfile, cert script, doc deploy)
```

---

## 10 pendentes priorizados

### 🔴 ALTA — Bloqueantes de produção

**P1. Credenciais admin em `.env` não são as de produção**
```bash
# Gerar senhas fortes e configurar .env.production
openssl rand -hex 32   # para JWT_SECRET
openssl rand -hex 16   # para POSTGRES_PASSWORD, RABBITMQ_PASSWORD

# Gerar VAPID keys (necessário para push)
cd backend && npx web-push generate-vapid-keys
# Anotar public e private key — adicionar ao .env.production
```

**P2. Certificados SSL não existem**
```bash
# 1. Configurar DNS wildcard *.helpdeskmsm.com.br → IP do servidor
# 2. Executar (requer acesso DNS para criar registro TXT):
sudo ./scripts/gen-wildcard-cert.sh
# 3. Copiar certificados para nginx/certs/
sudo cp /etc/letsencrypt/live/helpdeskmsm.com.br/fullchain.pem ./nginx/certs/
sudo cp /etc/letsencrypt/live/helpdeskmsm.com.br/privkey.pem   ./nginx/certs/
sudo chmod 600 ./nginx/certs/*.pem
```

**P3. Forward-merge de `origin/main` no branch**
```bash
git fetch origin main
git merge origin/main --no-ff
# Resolver conflitos se houver
git push origin feature/chatbot-upgrade
```

### 🟡 MÉDIA — Pré-deploy

**P4. Aplicar migrations no banco de produção**
```bash
docker compose exec backend npx prisma migrate deploy
# Verificar se todas as migrations applyaram:
docker compose exec backend npx prisma migrate status
```

**P5. Parear WhatsApp (se não estiver pareado)**
```bash
docker logs -f helpdesk_hermes   # escanear QR code
# Aguardar "QR code scan successful" ou "Connected"
# Parar com Ctrl+C
```

**P6. Configurar cron de backup do Postgres**
```bash
# Adicionar ao crontab do servidor:
sudo crontab -e
# Linha:
0 3 * * * pg_dump -U helpdesk helpdesk > /backups/helpdesk_$(date +\%Y\%m\%d_\%H\%M\%S).sql 2>> /var/log/pg_backup.log
```

**P7. Playwright E2E não roda em CI ainda**
```bash
# Configurar URLs em backend/playwright.config.ts:
# TI_URL, ELECTRIC_URL, COMPRAS_URL apontando pro staging
# Depois:
cd backend && npx playwright test
# Verificar se 3 fluxos passam (ti-ticket-flow, electric-checklist-flow, compras-approve-flow)
```

### 🟢 BAIXA — Pós-deploy

**P8. Lighthouse score ainda não medido**
```bash
# Após deploy, medir:
# - Performance ≥ 80
# - PWA ≥ 90
# - A11y ≥ 95
# Ferramenta: Chrome DevTools → Lighthouse ou PageSpeed Insights
```

**P9. Background sync de ticket offline (deferred)**
```bash
# Implementar quando PWA funcional — ver docs/CHAT_IMPLEMENTATION_FOR_MINIMAX.md Etapa G
```

**P10. iOS push tutorial ("Add to Home Screen")**
```bash
# O InstallPwaPrompt já tem o tutorial iOS (texto "No Safari, toque Compartilhar → Adicionar à Tela de Início")
# Testar manualmente num iPhone: Settings → Safari → Advanced → Web Inspector
```

---

## 6 decisões irrevogáveis

| # | Decisão | Justificativa |
|---|---------|---------------|
| 1 | **PWA único** — 1 manifest, 1 install, setor do JWT | Simplifica instalação mobile, elimina complexidade de 3 manifests |
| 2 | **Hermes dentro do Docker Compose** (`hermes-agent/` como submódulo) | Facilita backup da sessão WhatsApp (volume `hermes_whatsapp_session`) |
| 3 | **NestJS 11** (não atualizar axios sem quebra) | `npm audit fix --force` quebra breaking changes no @nestjs/core |
| 4 | **Bun como package manager do frontend** (`Frontend-chatbot`) | Spec do repo Lovable — não trocar por npm/yarn/pnpm |
| 5 | **Sector como enum (`TI`\|`ELECTRIC`\|`COMPRAS`)**, não String | Garantia de integridade em todo o codebase |
| 6 | **WS: JWT via cookie na handshake**, não Authorization header | Cookie é automático no browser; header requer custom client |

---

## 10 armadilhas testadas + workaround

| # | Armadilha | Sintoma | Workaround |
|---|-----------|---------|------------|
| 1 | `migrate dev` corrompe shadow DB | `Error: P3005` ou `Migration table is already up to date but shadow database failed` | Usar `prisma migrate deploy` em prod; `prisma db push` em dev para schema sync |
| 2 | `dist/` com owner `root` (arquivos de filmagem) | `EACCES permission denied, unlink '/dist/tsconfig.tsbuildinfo'` | `sudo chown -R dev:dev backend/dist/` ou `rm -rf backend/dist/` antes de build |
| 3 | `git add -A` inclui submódulo `hermes-agent/` | Commits com mudanças unintendeds no submódulo | `git add arquivo.ts` (por nome) ou `git add -A -- ':!hermes-agent/'` |
| 4 | GLPI vars ainda no `.env.example` (legado) | Confusão ao configurar ambiente novo | Deletar `GLPI_*` do `.env.example` — GLPI foi removido da codebase |
| 5 | `auth_token` em `localStorage` (frontend antigo) | 401 em prod onde cookie httpOnly é o correto | `Frontend-chatbot` usa cookie; se encontrar `localStorage.setItem('auth_token'` é código morto |
| 6 | `uuid-ossp` não existe no Postgres do container | `Error: function uuid_generate_v4() does not exist` | Migration `20260510120000_add_technical_reports` já adiciona extension — verificar `SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp';` |
| 7 | `env_file:` no compose recria container sem persistir | Variáveis de ambiente somem após restart | Não usar `env_file:` para vars que mudam; usar `environment:` inline ou `docker config create` |
| 8 | Prisma 6 Client Extension em `schema.prisma` | `Error: Cannot usePrismaClientAndNotConnected` em tests | Tests usam mock in-memory; extensão só ativa em runtime real |
| 9 | `vite-plugin-pwa` SW registrado em dev (default `enabled: false`) | Service worker polui DevTools em dev | Confirmed: `devOptions.enabled: false` no vite.config.ts — não muda |
| 10 | `socket.io-client@4.x` handshake com `withCredentials` | WS conecta mas não autentica | Confirmado funcionando em `Frontend-chatbot/src/lib/socket.ts` com `withCredentials: true` + cookie JWT |

---

## Mapa de arquivos críticos por responsabilidade

### Backend (este repo)
| Arquivo | O que faz | Não mexer se |
|---------|----------|--------------|
| `backend/src/presentation/controllers/tickets/tickets.controller.ts` | A1-A6 endpoints (inclui `/my`, `/history`, `/notes`) | A7 WS hardening (events.gateway.ts) |
| `backend/src/presentation/websockets/events.gateway.ts` | WS com JWT cookie + sector guard | — |
| `backend/src/presentation/websockets/team-chat.gateway.ts` | WS team-chat com JWT cookie | — |
| `backend/src/infrastructure/services/push.service.ts` | sendToUser / sendToSector via webpush | — |
| `backend/src/infrastructure/services/ticket-history.service.ts` | AuditLog + Message join | — |
| `backend/src/common/interceptors/trace-id.interceptor.ts` | X-Request-ID header em toda response | — |
| `backend/src/main.ts` | Helmet CSP, CORS allowlist, ValidationPipe | — |
| `backend/prisma/schema.prisma` | Fonte da verdade do DB | Migration antes de alterar |
| `docker-compose.yml` | Produção (postgres/redis/rabbitmq/backend/hermes/nginx) | — |

### Frontend (`Frontend-chatbot/`, repo separado `Berg-2019/Frontend-chatbot`)
| Arquivo | O que faz |
|---------|----------|
| `Frontend-chatbot/src/lib/api.ts` | 39 endpoints REST, axios interceptor 401 |
| `Frontend-chatbot/src/lib/socket.ts` | Client WS real (socket.io-client + cookie JWT) |
| `Frontend-chatbot/src/hooks/usePushNotifications.ts` | Hook VAPID subscription/unsubscription |
| `Frontend-chatbot/src/routes/__root.tsx` | Root layout + PWA meta tags + InstallPwaPrompt |
| `Frontend-chatbot/vite.config.ts` | VitePWA plugin + workbox caching |
| `Frontend-chatbot/public/manifest.webmanifest` | PWA manifest (1 para todos os setores) |
| `Frontend-chatbot/public/icons/{ti,electric,compras}/` | Ícones setoriais 192/512/maskable |

### Infra (neste repo)
| Arquivo | O que faz |
|---------|----------|
| `nginx/sites-enabled/helpdeskmsm.conf` | 4 vhosts, HSTS, CORS, WebSocket upgrade |
| `Frontend-chatbot/Dockerfile` | Multi-stage build (bun build → nginx serve) |
| `scripts/gen-wildcard-cert.sh` | certbot DNS-01 wildcard generation |
| `docs/DEPLOY_PRODUCAO.md` | Runbook completo de deploy |

---

## Fluxograma "agente novo" — ordem de leitura

```
1. → Leia este HANDOFF.md (agora)
2. → git log --oneline -10  (confirme 10 commits ahead)
3. → git status            (branc: feature/chatbot-upgrade)
4. → Confirme stack no ar   (6 comandos da seção "Como confirmar")
5. → npm run test          (backend, 61/61 passando)
6. → Leia AGENTS.md        (armadilhas do repo)
7. → Vá para CLAUDE.md     (arquitetura + convenções)
8. → Vá para PLANO_FRONTEND_INTEGRACAO_E_IMPLANTACAO.md (estado A+B+C+D ✅ E ⏳)
```

---

## Métricas atuais (confirmadas 2026-05-11)

| Métrica | Valor | Status |
|---------|-------|--------|
| Tests unitários | **61/61 passing** | ✅ |
| Test suites | **5/5 passing** | ✅ |
| `tsc --noEmit` backend | **0 erros** | ✅ |
| `npm run build` frontend | **exit 0** | ✅ |
| Commits ahead de `origin/feature/chatbot-upgrade` | **10** | 🔴 aguardando push/merge |
| Commits ahead de `origin/main` | **165+** | 🔴 aguardando janela merge |
| nginx config tracked | ✅ | ✅ |
| Dockerfile frontend | ✅ | ✅ |
| Script cert wildcard | ✅ | ✅ |
| Doc deploy produção | ✅ | ✅ |
| `grep DEMO_USERS\|mockLoans\|demoData` frontend | **zero hits** | ✅ |
| `grep localStorage` em api.ts/socket.ts | **apenas auth_token + user_data + pwa_dismiss_key** | ✅ |
| npm audit high+critical (backend) | **3 high** (axios×14, defu, effect — todos deferred) | 🟡 |
| npm audit (frontend) | **1 moderate** (postcss — deferred) | 🟡 |

---

## Credenciais admin (development .env)

```bash
# Backend .env (não é produção — confirmar valores em .env.production)
POSTGRES_PASSWORD=helpdesk123
RABBITMQ_PASSWORD=helpdesk123

# Login (dev — .env):
email: admin@helpdesk.com
password: admin123

# Para production: usar .env.production com senhas fortes (openssl rand -hex 32)
```

---

## Referências

| Arquivo | O que é |
|---------|---------|
| [`CLAUDE.md`](CLAUDE.md) | Convenções, arquitetura, stack, portas, auth, endpoints |
| [`AGENTS.md`](AGENTS.md) | Armadilhas, padrões, submódulo hermes-agent, nginx não commitado |
| [`IMPLEMENTATION_PLAN_V3.md`](IMPLEMENTATION_PLAN_V3.md) | Plano mãe (V3) — todas as fases |
| [`PLANO_FRONTEND_INTEGRACAO_E_IMPLANTACAO.md`](PLANO_FRONTEND_INTEGRACAO_E_IMPLANTACAO.md) | Plano desta integração — estado A+B+C+D ✅ E ⏳ |
| [`IMPLEMENTATION_CHECKLIST.md`](IMPLEMENTATION_CHECKLIST.md) | Checklist detalhada com tudo marcado |
| [`docs/DEPLOY_PRODUCAO.md`](docs/DEPLOY_PRODUCAO.md) | Runbook de deploy com E1-E7 |
| [`docs/CHAT_IMPLEMENTATION_FOR_MINIMAX.md`](docs/CHAT_IMPLEMENTATION_FOR_MINIMAX.md) | Chat estilo WhatsApp — 6 etapas (A-F, ~16h) |

---

## Próximo passo recomendado

Se você é o próximo agente, **vá para P1 (alta prioridade)**:

```bash
# 1. Pushar os 10 commits locais
git push origin feature/chatbot-upgrade

# 2. Gerar .env.production (P1)
openssl rand -hex 64   # JWT_SECRET
openssl rand -hex 32   # POSTGRES_PASSWORD

# 3.cd backend && npx web-push generate-vapid-keys   # P1 — anote as keys

# 4. Merge origin/main (P3)
git fetch origin main && git merge origin/main --no-ff

# 5. docker compose up -d + smoke test (P4)
# Ver docs/DEPLOY_PRODUCAO.md E4 para sequência completa
```