# 📓 Diário de Progresso — Helpdesk MSM

> Registro cronológico das sessões de trabalho. Cada entrada: objetivo → o que foi feito → arquivos → verificação → status.
> Docs complementares: [HANDOFF.md](HANDOFF.md) (snapshot), [ONBOARDING_AGENTES.md](ONBOARDING_AGENTES.md), [ESCALONAMENTO.md](ESCALONAMENTO.md).

---

## Sessão 2026-06-15 — Prontidão para produção, segurança e correções

**Pedido inicial:** analisar/testar o sistema e afirmar se está pronto, com foco na função principal (**criação de agente + envio de login via bot e email**). Depois evoluiu para limpeza, documentação, hardening de segurança e correção de bug.

### Indicadores ao fim da sessão
| Indicador | Valor |
|-----------|-------|
| Testes unitários | **107/107** ✅ (eram 100; +7 do resolver de mídia) |
| Typecheck (`tsc --noEmit`) | **0 erros** ✅ |
| Vulnerabilidades reais corrigidas | 5 IDOR + 3 hardening |
| Bugs funcionais corrigidos | 1 (mídia outgoing WhatsApp) |
| Endpoints mortos removidos | 3 + shims Hermes |

---

### 1. Verificação da função principal (onboarding de agente) — ✅ PRONTA
- **Fluxo testado E2E ao vivo** contra a stack rodando: admin cria agente sem senha → token de ativação (uso único, 1h, só hash no banco) → email (SMTP Hostinger conectado) + WhatsApp (bot pareado) → agente define senha → login JWT SSO.
- Verificado: replay de token → 410; senha fraca → 400; login com senha nova → 201 + cookie.
- **Bloqueador encontrado e corrigido:** link de ativação sairia como `http://localhost/...` (quebrado). Causa: `APP_PUBLIC_URL` não era repassada ao container. Corrigido nos 2 `docker-compose` + verificado.
- Guia criado: [ONBOARDING_AGENTES.md](ONBOARDING_AGENTES.md).

### 2. Limpeza (a pedido) — ✅
- Removidos **artefatos de teste** (`test-results/`, `playwright-report/`); suíte de testes mantida.
- Removidos **shims mortos do Hermes** (`HERMES_API_KEY`, header `x-hermes-api-key`).
- Removidos **3 endpoints internos vestigiais** (ponte Hermes, sem caller): `tickets/by-phone`, `chat/messages/:id/wa-id`, `chat/media-internal` + métodos órfãos. Verificado em runtime: 404.
- **Mantido** `tickets/attachments/:id/file` — estava wired ao `addAttachment` (ver item 5).

### 3. Documentação — ✅
- [ONBOARDING_AGENTES.md](ONBOARDING_AGENTES.md), [ESCALONAMENTO.md](ESCALONAMENTO.md) criados; ponteiros em [CLAUDE.md](CLAUDE.md)/[HANDOFF.md](HANDOFF.md).

### 4. Escalonamento horizontal — 📋 só documentado (decisão do usuário)
- Diagnóstico em [ESCALONAMENTO.md](ESCALONAMENTO.md): backend é **instância única**. 3 bloqueadores p/ N réplicas: Baileys inicia em toda réplica, crons duplicados, Socket.IO sem Redis adapter. Plano `WORKER_MODE` documentado. **Não implementado.**

### 5. Segurança — triagem de auditoria externa + fixes — ✅
Relatório externo (22 achados) **verificado contra o código**. Aplicados os reais; falsos positivos descartados com evidência.

**Corrigido + verificado (IDOR de setor / cross-tenant):**
- **CS-IDOR-003** `GET /chat/conversations` pegava `sector` do query → agora vem do JWT (só ADMIN global filtra via query). [chat.controller.ts](backend/src/presentation/controllers/chat/chat.controller.ts)
- **CS-IDOR-004** `live-view` idem + `agents`/`unassigned` sem filtro → `scopeSector()` role-aware + filtro no service. [live-view.controller.ts](backend/src/presentation/controllers/live-view/live-view.controller.ts)
- **CS-BROADCAST-001** gateway emitia `ticket:*` **global** → agora por room `sector:<setor>`. [events.gateway.ts](backend/src/presentation/websockets/events.gateway.ts)
- **CS-IDOR-001** contacts (`upsert`/`spam-score`/`spam/detect`/`is-blocked`) eram **públicos** → exigem JWT (401 verificado).
- **CS-IDOR-002** `tickets/:id/rate` público sem validação → JWT + range 1-5.

**Falsos positivos descartados:** CS-AUTH-002 (JWT tem `expiresIn: 7d`), CS-SECRETS-001 (`.env` gitignored, nunca commitado), CS-AUTH-001 (lança em prod se `ADMIN_PASSWORD` ausente), CS-CORS-001 (CORS é browser-side), CS-PATH-001 (era baixo — depois endurecido no item 7).

### 6. Hardening de segurança — ✅
- **Upload** (CS-UPLOAD-001 — relatório superestimou: só `tickets` faltava filtro). Helper [common/upload/upload.config.ts](backend/src/common/upload/upload.config.ts): allowlist MIME + **bloqueio de extensão perigosa mesmo com MIME forjado** (exe/sh/html/svg…) + limits 25MB/1 arquivo, nos 3 módulos. Verificado: `.exe`→400, `.png` passa.
- **Body parser** (CS-BODY-001): `50mb`→`2mb` em [main.ts](backend/src/main.ts). Verificado: 3MB→413.
- **Redis** (CS-REDIS-001): `requirepass` + healthcheck autenticado + `REDIS_URL` com senha em [docker-compose.yml](docker-compose.yml) (prod) + `REDIS_PASSWORD` no `.env.example`. Dev sem senha de propósito (rede interna).

### 7. Bug funcional: mídia outgoing do WhatsApp — ✅ corrigido (debug sistemático + TDD)
- **Sintoma:** anexo enviado por técnico (`POST /tickets/:id/attachments`) não chegava ao cliente nem aparecia na UI.
- **Causa raiz:** `addAttachment` violava a convenção de mídia — publicava uma URL http p/ endpoint (`…/attachments/:id/file`) em vez do caminho relativo do arquivo; não setava a coluna `mediaUrl`; não mandava `messageId`. E **dois consumidores** (bot e `getMedia`) tinham `uploads/messages/` **hardcoded**, falhando para anexos em `uploads/attachments/`. (Caminho dormente — frontend usa `/chat/messages/:ticketId`, que funciona.)
- **Fix de causa raiz:** resolver puro, seguro contra path traversal e restrito a `uploads/` ([common/upload/media-path.util.ts](backend/src/common/upload/media-path.util.ts), 7 testes), usado no bot e no `getMedia`; `addAttachment` conformado à convenção (caminho relativo + coluna `mediaUrl` + `messageId`). **Corrige CS-PATH-001 de brinde.**
- **Verificado em runtime:** upload → `Message.mediaUrl` setada → `GET /chat/media/:id` → 200 `image/png` (antes 404).

### 8. Suíte Playwright E2E — executada; **suíte está stale** (não revela bugs do app)
- **Setup montado:** frontend dev em `localhost:5173` com `VITE_API_URL=http://localhost:3000/api` (PWA único serve os 3 setores); backend dev localhost-friendly (cookie host-only, `COOKIE_SECURE=false`, CORS reflete 5173). Playwright 1.59.1 + chromium ok; usuários de teste seedados (`ti_agent`/`electric_agent`/`admin_compras` com `password123`).
- **Resultado:** 5 passou / 21 falhou (1ª rodada, cold). **Causa não é bug do app:**
  - Provado por sonda Playwright dedicada: login no browser → `POST /auth/login` **201**, cookie `helpdesk_session@localhost` setado, navegou para `/tickets`. **Auth + SSO (localhost) funcionam E2E.**
  - Falhas dominadas por (a) **cold start do Vite dev** (1ª navegação compila rota on-demand → estoura `waitForURL` 15s; warm já melhora), (b) **drift de seletor/fixture** — os specs assumem markup (`/tickets/new` com labels título/descrição/localização, lista `table tbody tr`/`[data-testid="ticket-card"]`, classes de erro) e dados seedados (tickets/PRs/assets) que **não batem** com o `Frontend-chatbot` atual (resetado na Fase 6), (c) **SSO valida domínio `.helpdeskmsm.local`** (desenhado p/ subdomínios, não localhost).
- **Conclusão:** a suíte E2E precisa ser **atualizada** (seletores + `data-testid` no frontend + seed de fixtures + stack de subdomínios `docker-compose.staging.yml`) para virar um sinal confiável. Não é um "rodar e pronto" — é trabalho de Fase 6. **Não há bug de app evidenciado.**

### 9. Frontend — direcionamento por setor + cadastro de agente (2026-06-15)
Spec: [2026-06-15-front-setor-cadastro-design.md](2026-06-15-front-setor-cadastro-design.md). Decisão mantida: **PWA único** (setor vem do JWT, sem redirect de subdomínio).
- **Seletor de setor removido:** `<SectorSwitcher>` fora de `settings.tsx` + componente deletado. Setor vem só do JWT.
- **Cadastro de agente:** nova rota página-inteira `/admin/users/new` (`users.new.tsx`) com **dados cadastrais + cargo + setor** (sem senha). Submit → `POST /users` → dispara o link de login (email/WhatsApp). Botão "Novo" ligado. **Verificado E2E (Playwright):** login admin → form renderiza → cria agente (AGENT/TI, pendente) → navega para a lista.
- **Landing pós-login:** `index.tsx` agora manda Elétrica+engenheiro → `/engineer` (casa com o BottomNav).
- **3 bugs pré-existentes corrigidos** (bloqueavam toda a seção /admin):
  1. `AuthContext.loadUser` fazia `res.data as User` em vez de `res.data.user` → no **refresh**, `role`/`sector` ficavam `undefined` (isAdmin falso, setor caía p/ TI). **Corrigido.**
  2. `admin/route.tsx` (layout) nunca renderizava `<Outlet/>` (só `Navigate`) → filhos não apareciam. **Corrigido** (Outlet + redirect só no /admin exato).
  3. Estrutura de rota: `admin/users.tsx` (lista) fazia `users.new` virar filho sem Outlet → form escondido. **Corrigido** espelhando o padrão de `tickets` (`users.index.tsx` + `users.new.tsx`, sem `users.tsx`).
- Frontend typecheck (`bunx tsc --noEmit`): **0 erros**.

**Follow-ups (resolvidos 2026-06-15, a pedido):**
- **Botão "Novo" só para ADMIN global:** `canCreate = user?.role === 'ADMIN'` esconde o botão em `users.index.tsx`, e `users.new.tsx` redireciona não-ADMIN-global para a lista (defesa por URL). Alinha com o backend (`POST /users` exige `ADMIN`). Verificado: ADMIN_TI não vê botão e é redirecionado; ADMIN global vê e cria.
- **`purchases.new` corrigido** (mesmo bug de Outlet): `purchases.tsx` → `purchases.index.tsx` (padrão flat, igual tickets). Verificado: `/purchases/new` renderiza para agente TI (antes não renderizava).

---

### 10. Suíte E2E atualizada — **VERDE (12/12)** + 5 bugs reais corrigidos (2026-06-25)
A pedido, atualizei o E2E. Decisão: **`Frontend-chatbot/e2e/` é o canônico** (localhost, PWA único); `backend/e2e/` (stale, subdomínios) **removido**.
- **Seed idempotente** [backend/prisma/seeds/e2e-users.seed.ts](backend/prisma/seeds/e2e-users.seed.ts) + script `npm run seed:e2e`: cria ti/electric/compras agents + `e2e_admin` (ADMIN global), senha `password123`. O `global-setup` roda automático (best-effort via `docker exec`).
- Suíte **turnkey**: `webServer` sobe o frontend dev com `VITE_API_URL` inline; `npm run test:e2e` → seed + sobe app + roda. **12/12 passam (~23s).**
- **5 bugs reais que o E2E pegou e eu corrigi:**
  1. **CORS**: `extraHTTPHeaders: x-e2e-test` no playwright.config disparava preflight CORS (não estava em `allowedHeaders`) → quebrava todo login. Removido.
  2. **Soft-delete quebrado** ([prisma.service.ts](backend/src/infrastructure/database/prisma.service.ts)): a extensão usava `this` errado → `undefined.update` → **DELETE de User/Ticket/Message/Contact dava 500**. Corrigido capturando o client estendido (`ext`).
  3. **Priority enum** ([tickets.new.tsx](Frontend-chatbot/src/routes/_authed/tickets.new.tsx)): form mandava `low/medium/high/critical`, backend espera `LOW/NORMAL/HIGH/URGENT` → **toda criação de ticket pela UI dava 400**. Valores corrigidos.
  4. **Ticket sem setor** ([tickets.controller.ts](backend/src/presentation/controllers/tickets/tickets.controller.ts)): `POST /tickets` não setava `sector` do JWT → ticket com setor nulo, **invisível na lista filtrada por setor**. Agora seta do `req.user`.
  5. **Rate limit de login** (5/min) estourava na suíte (~12 logins) → 429. Tornei o limite configurável por env `LOGIN_THROTTLE_LIMIT` (prod=5; dev=100). [auth.controller.ts](backend/src/presentation/controllers/auth/auth.controller.ts) + [docker-compose.dev.yml](docker-compose.dev.yml).
- Também: specs robustos a re-render em tempo real (toBeAttached + navegação por href), backend 107/107 testes, frontend tsc 0 erros.

### 11. Domínio de teste `dev.helpdeskmsm.com.br` + correção do PWA (2026-06-26)
Domínio real apontado para uma **VM de nginx reverse** (SSL) que proxia para esta máquina (`:80`, nginx interno catch-all que serve o SPA + `/api` + `/socket.io`). Modelo **mesma origem** (build usa `/api` e `/` relativos) → sem CORS, cookie host-only.
- **Lado desta máquina:** `client_max_body_size 30M` no nginx interno (uploads ≤25MB); `FRONTEND_URL` + `APP_PUBLIC_URL=https://dev.helpdeskmsm.com.br` (origin do Socket.IO + links de ativação); **frontend rebuildado** (o build servido era de 21/06). Prompt completo de config da VM reverse entregue (SSL/WS/upgrade/timeouts/body-size).
- **Gotchas resolvidos durante o teste:** cert errado na VM reverse (`ERR_CERT_COMMON_NAME_INVALID` — apontar wildcard `*.helpdeskmsm.com.br` ou emitir cert do subdomínio); 401 no login era **autofill do navegador** (backend OK).
- **Bug do PWA (Service Worker) — corrigido:** o `vite-plugin-pwa` **não emitia `sw.js`** no build do TanStack Start (gerava só `registerSW.js`, nem injetado no html) → SW nunca registrava → `usePushNotifications` ficava com `swRegistration=null` → **toggle de push não fazia nada**. Fix: `Frontend-chatbot/public/sw.js` próprio (push + `notificationclick`→abre URL + fallback offline) + registro explícito no [__root.tsx](Frontend-chatbot/src/routes/__root.tsx) (só em PROD). Verificado: `/sw.js` servido (200, é o nosso) + registro no bundle.
- **Push por setor:** [push.service.ts](backend/src/presentation/controllers/push/push.service.ts) agora usa o ícone do setor do destinatário (`/icons/{ti,electric,compras}/icon-192.png`) em vez do genérico.

### 12. Dashboard de gestão do setor (admin) — visual Materio (azul+preto) (2026-06-27)
Login admin agora cai num **painel de gestão**. Inspiração de layout: template **Materio** (sidebar + topbar + cards tonais + charts + tabela), recriado em **shadcn/Tailwind + Recharts** (sem MUI), paleta **azul + preto**.
- **Backend:** novo `GET /api/metrics/management?sector=&period=` ([metrics.service.ts](backend/src/presentation/controllers/metrics/metrics.service.ts) + controller) — KPIs, saúde de SLA, **ranking de agentes em tempo real** (resolvidos, % SLA cumprido via `SlaTimer`, CSAT, tempo médio, status ao vivo). Setor **forçado pelo JWT** (admin de setor); ADMIN global filtra via query/consolidado. Verificado: agente→403, admin→dados, setor forçado, tempo real (não usa o cron `AgentMetric`).
- **Frontend:** shell do painel em [admin/route.tsx](Frontend-chatbot/src/routes/_authed/admin/route.tsx) (sidebar preto + acento azul + drawer mobile), [admin/dashboard.tsx](Frontend-chatbot/src/routes/_authed/admin/dashboard.tsx) (KPIs `StatCard` tonais, LineChart/BarChart, tabela de ranking), seletor de período (Hoje/7d/30d) + setor (só global). Admin cai em `/admin/dashboard` no login; `BottomNav` escondido em `/admin`.
- **Bug lateral corrigido:** o seed e2e agora reseta `deletedAt: null` (usuários soft-deletados não logavam após o fix de soft-delete).
- Verificado: backend 107/107 + tsc 0; frontend tsc 0 + **E2E 12/12**; build servido no domínio (`/api/metrics/management` → 200).

### 13. Chat da equipe (admin ↔ agentes), por setor, tempo real (2026-06-27)
Admin conversa com os agentes do setor. O backend de team-chat já existia (controller REST `/team-chat` + `events.gateway` com `team:join`/`team:message`), mas o frontend era um stub com fios trocados.
- **Backend:** corrigido o `events.gateway` `team:message` para **persistir no setor do remetente** ([events.gateway.ts](backend/src/presentation/websockets/events.gateway.ts)) — antes salvava sempre como TI (default).
- **Frontend:** componente limpo [TeamChat.tsx](Frontend-chatbot/src/components/TeamChat.tsx) (histórico via `GET /team-chat`, entra na sala `team-chat:<setor>` via `team:join`, envia/recebe via `team:message` no socket default; o remetente também recebe o broadcast, sem optimistic). Surfaceado em **dois lugares**: página `/admin/team` no painel admin (nav "Equipe") e rota `/team` do agente ([team.tsx](Frontend-chatbot/src/routes/_authed/team.tsx)) + aba "Equipe" no `BottomNav`.
- **Verificado E2E ao vivo (2 navegadores):** admin envia → **agente recebe em tempo real**; agente responde → **admin recebe**. tsc 0 (front+back), E2E 12/12, build no domínio.

### 14. Chamados: lista de ativos + aba de busca/histórico (2026-06-27)
A aba Chamados acumulava tudo. Agora separa **ativos** de **histórico**.
- **Backend** ([tickets.service.ts](backend/src/presentation/controllers/tickets/tickets.service.ts) + controller): `findAll` ganhou `view=active` (mostra só abertos/atribuídos/em atendimento/aguardando + resolvidos/fechados **nas últimas 24h**, via `updatedAt`) e `search` (busca por **nº/id**, **título** e **relato/descrição**, `contains` insensitive). Repassados em `GET /tickets` e `/tickets/my`. Verificado via curl: setor com 8 tickets → `view=active` retorna 4; `search` filtra.
- **Frontend** ([tickets.index.tsx](Frontend-chatbot/src/routes/_authed/tickets.index.tsx)): alternância **Ativos / Buscar**. "Ativos" mantém o toggle Todos/Meus (agora `view=active`). "Buscar" tem campo de texto (nº/título/relato, debounce 300ms) + filtro de **status**, buscando no histórico completo; cards mostram a **data**. Verificado ao vivo: lista ativa reduzida; busca "Bug" → 3 resultados.
- tsc 0 (front+back) · E2E 12/12 · backend já live (container dev em watch que o nginx usa) · frontend rebuild+deploy.

### 15. Messenger interno unificado na aba Chat (grupos + DMs, estilo WhatsApp) (2026-06-27)
Havia duas abas de chat (a "Chat" via `TeamChatPanel` e a "Equipe" do item 13). Consolidado numa só: a aba **Chat** virou um messenger estilo WhatsApp. Spec: [2026-06-27-messenger-chat-unificado-design.md](2026-06-27-messenger-chat-unificado-design.md).
- **Modelo novo** (Prisma, `db push` — `migrate dev` quebra no shadow por migration legada com `uuid_generate_v4()`): `ChatConversation`(GROUP|DIRECT) + `ChatParticipant`(`lastReadAt`) + `ChatMessage`. `TeamMessage` ficou órfão (não migrado).
- **Backend** [`messenger`](backend/src/presentation/controllers/messenger/): `GET /messenger/conversations|/:id/messages|/contacts`, `POST /direct/:userId|/conversations/:id/read`. Grupo do setor *lazy*. DM **mesmo setor** (ADMIN global cross-setor). Tempo real no [events.gateway](backend/src/presentation/websockets/events.gateway.ts): sala `user:<id>` + `chat:send`→`chat:message`/`chat:conversation` pras salas dos participantes. **Não-lidas** via `lastReadAt`.
- **Frontend**: [chat.index.tsx](Frontend-chatbot/src/routes/_authed/chat.index.tsx) em 2 painéis (desktop) e **mobile WhatsApp** (lista → toca → thread overlay `fixed inset-0 z-[60]` cobrindo o BottomNav → voltar; conversa via search param `?c`). Componentes [ConversationList](Frontend-chatbot/src/components/messenger/ConversationList.tsx)/[ChatThread](Frontend-chatbot/src/components/messenger/ChatThread.tsx)/[ContactPicker](Frontend-chatbot/src/components/messenger/ContactPicker.tsx).
- **Aposentado**: aba "Equipe" + `/admin/team` (→ "Mensagens" no painel admin aponta pra `/chat`), `TeamChat`/`TeamChatPanel`, `team-chat.*` (controller/gateway/module) e handlers `team:*`. Cliente (`/chat/conversations`) intacto.
- **Verificado**: curl (grupo auto-criado, DM idempotente, anti-IDOR 403, cross-setor 403); **E2E ao vivo 2 navegadores** (DM admin↔agente em tempo real, badge não-lida, grupo); **mobile** (overlay cobre BottomNav, voltar funciona). tsc 0 (front+back) · jest 107/107 · E2E 12/12 · build+deploy.

### 16. Botão "Instalar app" (PWA) no Perfil — desktop + mobile (2026-06-27)
Faltava um jeito persistente de instalar o PWA (área de trabalho no PC / tela inicial no celular).
- **[pwa-install.ts](Frontend-chatbot/src/lib/pwa-install.ts)** (novo): singleton que captura `beforeinstallprompt` no load (cedo, via `__root`) + `appinstalled` + `display-mode: standalone`, expõe `usePwaInstall()` (`canInstall`, `installed`, `isIOS`, `promptInstall`) com `useSyncExternalStore`.
- **[settings.tsx](Frontend-chatbot/src/routes/_authed/settings.tsx)**: card **"Instalar app"** — botão nativo quando `canInstall` (Chrome/Edge desktop + Android), instruções no iOS (Compartilhar → Adicionar à Tela de Início) e fallback "menu do navegador (⋮)"; mostra "App instalado" quando em standalone.
- **[InstallPwaPrompt.tsx](Frontend-chatbot/src/components/InstallPwaPrompt.tsx)** refatorado pra usar o hook (fonte única); removido o render duplicado em `_authed` (ficava 2×).
- Manifest já tinha ícones 192/512/maskable + `display: standalone` (instalável). Verificado: card renderiza; ao disparar `beforeinstallprompt` o botão "Instalar" aparece. tsc 0 · E2E 12/12 · build+deploy.

### 17. Relatório de desempenho de agentes em PDF + análise por IA (2026-06-29)
Admin extrai relatório de desempenho dos agentes em PDF (estatística do período + análise comportamental por IA).
- **Backend** ([controllers/reports/](backend/src/presentation/controllers/reports/)): `pdfmake@0.2.20` (fontes Roboto via `vfs_fonts`, sem Chromium). `agent-report.service` agrega o período em tempo real (volume, tempos, % SLA, CSAT médio + distribuição + comentários, distribuição por prioridade/categoria/tipo). `report-ai.service` chama **MiniMax** (trocável por `REPORT_AI_PROVIDER=glm`) e devolve `{pontosPositivos, pontosAtencao, dicaCrescimento}` — **fallback gracioso** se a IA falhar. `agent-report-pdf.service` monta o PDF. Endpoints: `GET /reports/agent/:id/pdf`, `GET /reports/agents/pdf` (consolidado), `GET /reports/agents` (lista p/ seletor). Setor forçado pelo JWT (anti-IDOR).
- **Frontend** ([admin/reports.tsx](Frontend-chatbot/src/routes/_authed/admin/reports.tsx)): página no painel (nav "Relatórios") com período (30/60/90d), seletor de setor (admin global) e de agente, e botões de download (blob). `reportsService` + `downloadBlob` no [api.ts](Frontend-chatbot/src/lib/api.ts).
- **Verificado:** curl → PDF 200 `%PDF` (agente e consolidado); **AGENT → 403**; **cross-setor → 403**; sector-admin ignora `?sector` alheio. Download real no navegador OK. tsc 0 (front+back) · jest 107/107 · E2E 12/12 · build+deploy. **Obs:** MiniMax com plano suspenso → análise usa o fallback até reativar.

### 18. Limpeza de provedores de IA — só MiniMax + GLM (2026-06-29)
A pedido: manter só **MiniMax (primário) + GLM (fallback)**, removendo Ollama e Anthropic.
- [intent.service.ts](backend/src/presentation/controllers/intent/intent.service.ts): removido todo o Ollama (`checkOllamaAvailability`, `classifyWithOllama`, `onModuleInit`, envs `OLLAMA_*`); fluxo agora é **MiniMax → GLM → default `outro`**. `getStatistics`/`getStatus` refletem o provider ativo.
- Removida a dep **`@anthropic-ai/sdk`** (não era usada em lugar nenhum) do `backend/package.json`.
- `.env.example`: fora `OLLAMA_*`/`ANTHROPIC_*`; entram `GLM_API_KEY`/`GLM_API_URL`/`GLM_MODEL` + `REPORT_AI_PROVIDER`. CLAUDE.md atualizado.
- Verificado: backend sobe limpo, tsc 0, jest 107/107. (MiniMax com plano suspenso → intent cai no fallback/`outro` até reativar.)

### 19. Fase C — corte de produção pro sistema novo, domínio `helpdeskmsm.support` (2026-06-30)
Produção desta VM rodava uma cópia desatualizada (`develop`, 20 commits atrás de `feature/chatbot-upgrade`). Virada completa pro sistema real (227 commits), seguindo o `PLANO_ATUALIZACAO_PRODUCAO.md`.
- **`develop` resetada** (`git reset --hard origin/feature/chatbot-upgrade`) — os 3 commits exclusivos de `develop` eram descartáveis (tocavam `frontend/`/`bot/` que não existem mais na branch nova). Nada disso tinha sido enviado a `origin/develop`.
- **`Frontend-chatbot` clonado** nesta VM (repo separado, `Berg-2019/Frontend-chatbot`, branch `feature/chatbot-upgrade` — atenção: o clone inicial veio em `main` por engano, corrigido depois).
- **Limpeza Fase A** (a doc dizia "✅ feito" mas não estava no código): `DevModule` gateado por `NODE_ENV !== 'production'` em [app.module.ts](backend/src/app.module.ts); `backend/prisma/seed.ts.disabled` e `backend/test-intent-bot-integration.ts` removidos; script `prisma:seed` repontado pra `seeds/settings.seed.ts`.
- **ETL de tickets** ([migrate-tickets-from-prod.ts](backend/prisma/migrations-data/migrate-tickets-from-prod.ts)) — não existia (doc errada de novo), escrito do zero: lê o banco antigo via SQL bruto, migra **tickets + mensagens** preservando `id`/`glpiId`, mapeia `sector` String→enum (TI/ELECTRIC/COMPRAS; resto fica `NULL` — decisão consciente, ~172 dos 191 tickets ficaram sem setor), `assignedToId`/`senderId` sempre `null` (usuários não migrados). `--dry-run` suportado, idempotente via upsert por `id`.
- **2 bugs de migration pré-existentes corrigidos** (achados rodando `prisma migrate deploy` contra banco vazio, nunca tinha sido testado assim): `20260504170000_add_message_media_and_reads` quebrava (faltava `DROP DEFAULT` antes de trocar enum + usava `UUID` nativo onde o resto do schema usa `TEXT`); `User.deletedAt` no schema sem migration (resolvido com `db push --accept-data-loss` num banco ainda vazio, sem risco).
- **GLPI descomissionado**: backup do banco (76MB) + arquivos (93MB) em `backups/`, containers `helpdesk_glpi`/`helpdesk_mysql` parados e removidos, vhost `glpi.helpdeskmsm.com.br` removido do nginx.
- **Domínio novo `helpdeskmsm.support`** substitui `helpdeskmsm.com.br` por completo: nginx interno (containerizado, já vinha no repo) na porta 8080 (só loopback) por trás do nginx de sistema, que termina SSL (Let's Encrypt via certbot) e faz proxy. **Achado:** toda vez que o container `backend` é recriado, o `nginx` (interno) precisa reiniciar também — ele cacheia o IP antigo do backend e passa a dar 502.
- **`.env` de produção** remontado do zero (segredos do ambiente de teste reaproveitados: MiniMax, SMTP Hostinger `adm-msm@helpdeskmsm.com.br`, VAPID; `REDIS_PASSWORD` e `ADMIN_PASSWORD` novos gerados).
- Sessão do WhatsApp **não sobreviveu** à troca de volume (`bot_sessions` → `whatsapp_sessions`) — precisou de QR novo.
- Verificado: 191 tickets / 1452 mensagens migrados (contagem bate); login funcionando; smoke test via loopback com `Host` header (curl direto pro domínio público falha **dessa VM** por hairpin NAT — confirmado que não é bug real porque o desafio HTTP-01 do certbot, validado por servidor externo do Let's Encrypt, passou).

### 20. Categoria "Engenheiro" (setor elétrico) + CREA em laudos (2026-06-30)
Pedido: usuário "Engenheiro" administra o setor elétrico e assina laudos técnicos — precisa de permissão especial.
- **Decisão:** reaproveitar o papel `ADMIN_ELECTRIC` já existente (já dava acesso ao portal `/engineer`) em vez de criar papel novo.
- **Bug de segurança corrigido**: `POST /technical-reports/:id/sign` aceitava qualquer `AGENT`/admin assinando como `ENGINEER` — travado em [technical-reports.service.ts](backend/src/presentation/controllers/technical-reports/technical-reports.service.ts) `addSignature()`: só o admin do mesmo setor do laudo (`ADMIN_ELECTRIC`/`ADMIN_TI`/`ADMIN_COMPRAS` conforme o setor, ou `ADMIN` global) pode assinar como `ENGINEER`.
- **Campo `creaNumber`** adicionado em `User` e `TechnicalReportSignature` (migration `20260630120000_add_crea_number`, aditiva). Laudos do setor `ELECTRIC` exigem CREA cadastrado pra assinar como engenheiro (snapshot gravado na assinatura, não referência viva).
- **Frontend**: opção "Engenheiro (Elétrica)" no formulário de criação de usuário, campo CREA condicional, exibido na assinatura do laudo.
- Verificado com usuários de teste reais (criados e removidos depois): AGENT tentando assinar → 403; engenheiro sem CREA → 400; engenheiro com CREA → 201 com CREA gravado; assinatura TECHNICIAN sem regressão.

### 21. Guia interativo de primeiro acesso (tour estilo jogo) (2026-06-30)
Tour com **driver.js** cobrindo navegação (adaptada por setor/cargo, reaproveitando a lógica do [BottomNav.tsx](Frontend-chatbot/src/components/BottomNav.tsx)) + botões-chave das telas principais (Chamados, Chat, Relatórios, Ativos, Compras, Painel do Engenheiro).
- [lib/tour.ts](Frontend-chatbot/src/lib/tour.ts): motor com fila sequencial (**bug real encontrado e corrigido**: os 2 tours automáticos de uma mesma página colidiam — a segunda chamada sobrescrevia a instância do driver.js da primeira e um dos dois sumia silenciosamente), flags em `localStorage`, kill-switch global (`tour_disabled_all`).
- Botão flutuante "?" ([TourHelpButton.tsx](Frontend-chatbot/src/components/TourHelpButton.tsx)): refazer tour do menu, refazer tour da tela atual, "não mostrar guias automaticamente".
- Verificado **com Playwright real** (login via cookie httpOnly, navegação, clique nos elementos) — fila sequencial sem colisão, flags persistem entre reloads, conteúdo muda corretamente por setor (testado TI e Compras lado a lado).

### 22. Deslogar todos + plano de duração de sessão configurável (2026-06-30)
Sem nenhuma forma de revogar sessão no sistema (JWT stateless, sem blocklist), pedido pra deslogar todo mundo agora.
- **Feito**: `JWT_SECRET` rotacionado + backend reiniciado — invalida todos os tokens emitidos com o segredo antigo (confirmado: token antigo → 401 depois do restart).
- **Planejado, não implementado** ([PLANO_DURACAO_SESSAO.md](PLANO_DURACAO_SESSAO.md), na raiz do repo): painel no console `/dev` pra configurar a duração da sessão (`auth.session.duration_hours`, reaproveitando o sistema de Settings já existente — sem migration nova) + botão "Deslogar todos agora" (`auth.session.invalidated_at`). A validação roda em `JwtStrategy.validate()` comparando `iat` contra essas duas configs lidas do banco a cada request — diferente do `exp` fixo do token, isso permite que mudar a duração afete sessões **já existentes**, não só logins futuros.

### 23. Fix: apelido não persistia + nome sumindo com 2 técnicos no chat do ticket + telefone "sumindo" (2026-06-30)
Usuário reportou: apelido trocado no perfil não refletia no chat do ticket (mostrava nome); com dois técnicos no mesmo chat, a segunda mensagem ficava sem nome (só do lado do painel — WhatsApp/cliente já estava certo); telefone preenchido na criação do agente "sumia" depois.
- **Causa raiz** (módulo real é [`chat/chat.service.ts`](backend/src/presentation/controllers/chat/chat.service.ts) — `GET/POST /chat/messages/:ticketId`, não o módulo `messages/` que parecia óbvio): `User` não tinha coluna `nickname` no banco (só existia no tipo do frontend/`localStorage`, `ProfileCard.handleSave()` nunca chamava o backend); `normalize()` descartava o `senderId` real e só devolvia a categoria genérica `sender: 'technician'`, então o frontend não conseguia diferenciar técnico A de técnico B — mensagens consecutivas de pessoas diferentes ficavam "agrupadas" e suprimiam o nome.
- **`nickname String?`** adicionado em `User` (migration aditiva). Endpoint novo de autoatendimento `PATCH /users/me` (antes só `ADMIN` podia editar qualquer usuário; escopo travado só em `nickname`, sem deixar o técnico mudar `role`/`active` de si mesmo). `chat.service.ts` `normalize()` agora devolve `senderId` real e prioriza `nickname` sobre `name` (também no rótulo de quem fala no WhatsApp).
- **Frontend** ([chat.$ticketId.tsx](Frontend-chatbot/src/routes/_authed/chat.$ticketId.tsx)): `mine` (lado/cor da bolha — equipe vs cliente) ficou como estava; `isMe` novo (`senderId === currentUser.id`) decide se mostra "Você" implícito ou o nome de outro técnico; `grouped` passou a exigir `senderId` igual, não só a categoria, pra não fundir visualmente mensagens de técnicos diferentes.
- **Bug extra achado de graça**: `findById()`/`update()` em `users.service.ts` tinham `select` incompleto (faltava `phoneNumber`, e no `update` também `sector`/`creaNumber`) — o telefone sempre foi salvo certo na criação, só não voltava nas buscas/edições seguintes. Selects corrigidos.
- Verificado com usuários/ticket de teste reais (removidos depois): apelido definido por autoatendimento persiste em `/auth/me`; dois técnicos mandando mensagem alternada no mesmo ticket → cada uma com `senderId`/nome corretos e distintos; telefone aparece em `GET`/`PUT /users/:id`. tsc 0 (frontend) · build limpo (backend).

---

## ⏭️ Pendentes para "pronto pra produção" pleno (não-segurança)
1. ~~Atualizar a suíte E2E~~ — **feito 2026-06-25 (item 10): verde, turnkey, canônico em `Frontend-chatbot/e2e/`.**
2. ~~Forward-merge com `origin/main`~~ — **feito 2026-06-30 (item 19): reset completo de `develop` pra `feature/chatbot-upgrade`, cutover em produção.**
3. **Higiene de secrets**: rotacionar/gerir os valores reais do `.env` fora do repo no deploy.
4. **Duração de sessão configurável + deslogar todos** — planejado em [PLANO_DURACAO_SESSAO.md](PLANO_DURACAO_SESSAO.md) (item 22), não implementado.
5. **Menores de segurança** (backlog em [HANDOFF.md](HANDOFF.md) §🔒): `live-view/timeline/:id` sem checagem de setor; `agent:status`/`bot:status` ainda globais; `users/technicians` sem filtro de setor; login timing.
6. **Escalonamento horizontal** ([ESCALONAMENTO.md](ESCALONAMENTO.md)) se o volume exigir N réplicas.
7. **Sessão WhatsApp precisa de novo QR code** — não sobreviveu à virada de volume do cutover (item 19).

## Veredito de prontidão (2026-06-15)
**Função principal (onboarding): pronta** para produção assim que `APP_PUBLIC_URL` apontar para o domínio real (default de prod já configurado). **Sistema como um todo: quase** — faltam itens 1-2 acima (E2E + merge) antes de um deploy tranquilo. Os bloqueadores de segurança críticos (IDOR cross-tenant) e o bug de mídia **estão resolvidos**.
