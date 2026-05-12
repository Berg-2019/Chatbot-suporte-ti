# ROADMAP — Finalizar + Testar

> Status: A+B+C+D ✅ completos · E: artefatos prontos · Deploy pendente servidor
> Atualizado: 2026-05-12

---

## Onde estamos

```
✅ A: Backend gaps fechados (GET /tickets/my, /history, /sla/*, /push/vapid-public-key, WS hardened)
✅ B: Frontend 100% de-mocked (0 demoData, 0 DEMO_USERS, SEED=[], socket.io real)
✅ C: PWA funcional (workbox, offline.html, usePushNotifications hook, InstallPwaPrompt)
✅ D: Hardening feito (TraceIdInterceptor, Helmet CSP, npm audit documentado, Playwright E2E suite)
⏳ E: Deploy — artefatos criados, faltam: VAPID keys + .env.production + DNS + servidor
```

---

## Roteiro de trabalho

### Sprint 1 — Teste + Verificação (hoje)

**T1. Verificar stack local rodando**
```bash
# Confirmar 6 containers up
docker ps --format "table {{.Names}}\t{{.Status}}" | grep helpdesk

# Backend health
curl -s http://localhost:3000/api/health

# 6 endpoints críticos
cd backend && npm run test 2>&1 | tail -3
```

**T2. Playwright E2E — rodar os 3 fluxos (precisa frontend no ar)**
```bash
# Frontend deve estar em npm run dev:ti / :electric / :compras
# (5173, 5174, 5175)
cd backend
npx playwright test --reporter=list 2>&1 | tail -20
# Esperado: 3 suites, testes passam ou skipped (se URLs de staging não configuradas)
```

**T3. Verificar zero mocks no frontend**
```bash
grep -rEn "DEMO_USERS|mockLoans|demoData|demoTicket|demoMessages" \
  Frontend-chatbot/src/ | grep -v "SEED=\[\]"

# Esperado: only userStore.ts com SEED=[] (vazio, necessário pro import)
```

**T4. Verificar endpoints A1-A6 (via nginx, requer Host header)**

O backend não expõe porta 3000 ao host diretamente — só via nginx na porta 80/443.
O nginx da `ti.helpdeskmsm.com.br` é SPA catch-all, não serve `/api/*` — precisa do vhost `api.helpdeskmsm.com.br`ou testar direto nos containers:

```bash
# Opção A: via docker exec (testa backend diretamente, sem nginx)
docker exec helpdesk_backend node -e "
const http = require('http');
const data = JSON.stringify({email:'admin@helpdesk.com',password:'admin123'});
const req = http.request({hostname:'localhost',port:3000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':data.length}}, res => {
  let body='''; res.on('data', c => body+=c); res.on('end', () => console.log(res.statusCode, body));
}); req.write(data); req.end();
"

# Opção B: curl direto no backend (se o docker-compose.dev.yml mapear :3000)
# (containers helpdesk_backend e helpdesk_nginx estão no ar ✅)

# Por ora considerar: backend healthy confirmed via logs (SlaBreachJob rodando),
# testes 61/61 passando, nginx no ar ✅
```

**T5. Verificar PWA setup**
```bash
ls Frontend-chatbot/public/manifest.webmanifest
ls Frontend-chatbot/public/icons/ti/
ls Frontend-chatbot/public/offline.html
grep -c "NetworkFirst\|CacheFirst" Frontend-chatbot/vite.config.ts  # deve ser > 0
```

---

### Sprint 2 — Preparar deploy (precisa ação do dono)

**T6. Gerar VAPID keys (blocoador para push)**
```bash
cd backend && npx web-push generate-vapid-keys
# Anotar public e private key — vão pro .env.production
```

**T7. Forward-merge `origin/main`**
```bash
git fetch origin main
git merge origin/main --no-ff
# Resolver conflitos se houver → push
```

**T8. Atualizar HANDOFF.md com data de hoje**

---

### Sprint 3 — Deploy produção (precisa servidor + DNS)

**T9. Configurar servidor** (docs/DEPLOY_PRODUCAO.md E1-E4)
```bash
# No servidor:
docker network create helpdesk_network

# Rodar E4 do docs/DEPLOY_PRODUCAO.md:
# 1. .env.production com VAPID keys + senhas fortes
# 2. gen-wildcard-cert.sh
# 3. docker compose build
# 4. docker compose up -d postgres redis rabbitmq
# 5. docker compose exec backend npx prisma migrate deploy
# 6. docker compose up -d backend hermes hermes-tools frontend nginx
```

**T10. Smoke final** (docs/DEPLOY_PRODUCAO.md E5)
```bash
curl -s https://api.helpdeskmsm.com.br/api/health
# SSO cookie entre subdomínios
# WebSocket 101
# WhatsApp connected
# PWA instalável (Chrome DevTools)
# Push subscribe → criar ticket → notificação chega
```

---

## Prioridades

| # | Tarefa | Prioridade | Bloqueia |
|---|--------|------------|----------|
| T1 | Verificar stack local | 🔴 ALTA | — |
| T2 | Rodar Playwright E2E | 🔴 ALTA | — |
| T3 | Verificar zero mocks | 🔴 ALTA | — |
| T4 | Verificar endpoints A1-A6 | 🔴 ALTA | — |
| T5 | Verificar PWA setup | 🔴 ALTA | — |
| T6 | Gerar VAPID keys | 🟡 MÉDIA | T10 (push) |
| T7 | Forward-merge main | 🟡 MÉDIA | merge final |
| T8 | Atualizar HANDOFF | 🟢 BAIXA | — |
| T9 | Deploy produção | 🔴 ALTA | T10 |
| T10 | Smoke produção | 🔴 ALTA | Done |

---

## Definição de "pronto" (do PLANO)

1. `grep demo|mock` frontend → só `SEED=[]`
2. `npm run test` → 61/61 passing
3. Playwright E2E → 3 fluxos verdes (ou skipped se staging não configurado)
4. 6 endpoints A1-A6 → 200/404/401 (nenhum 404)
5. PWA: manifest + icons + workbox + offline.html
6. `.env.production` com VAPID keys
7. Docker build succeed
8. Smoke produção passando

Mínimo para dizer "pronto pra merge": **T1+T3+T4+T5 + T6 + T7**