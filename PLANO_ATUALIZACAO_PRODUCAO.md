# Plano de Atualização para Produção — `feature/chatbot-upgrade`

> Status: **decisões confirmadas; Fase A (limpeza) e Fase B (script ETL) executadas.** Falta Fase C (merge+deploy+rodar ETL), que depende do seu ambiente/banco de produção.
> Última atualização: 2026-06-30

## Decisões confirmadas (2026-06-30)
1. **Banco novo + ETL apenas de tickets** (usuários recriados do zero).
2. **Escopo: tickets + histórico** — na prática = tickets **+ mensagens** (o modelo `Attachment` NÃO existe em `develop`, logo não há anexos a migrar).
3. **Atribuição:** tickets migrados ficam **sem responsável** (`assignedToId = null`); mensagens migram com `senderId = null`.
4. **Limpeza:** manter testes no repo; blindar prod (remover artefatos mortos, gatear DevModule/seeds).

## 1. Contexto

A branch `feature/chatbot-upgrade` está praticamente finalizada e será promovida a produção,
substituindo o sistema atual que roda na branch `develop`. Dois objetivos:

1. **Trazer os tickets** do sistema em produção (`develop`) para o sistema novo.
   Os **usuários NÃO serão migrados** — serão recriados do zero no sistema novo.
2. **Limpar a branch atual** de seeds/mocks/endpoints de dev que poluiriam ou exporiam
   o ambiente de produção, deixando-a pronta para deploy.

## 2. Diagnóstico (levantado nesta sessão)

### Branches
- `develop` = produção: ~7 migrations, schema antigo, GLPI ativo, `sector` como String livre,
  roles simples (`ADMIN`/`AGENT`).
- `feature/chatbot-upgrade` = novo: 27 migrations, schema novo. **227 commits à frente** de `develop`;
  `develop` tem **1 commit** que a feature não tem (precisa de forward-merge antes do merge final).

### Schema do Ticket — mudanças `develop` → novo (quase todas ADITIVAS)
| Campo | develop | novo | Tratamento na migração |
|-------|---------|------|------------------------|
| `id`, `glpiId`, `title`, `description`, `status`, `priority`, `category`, `solution`, `solutionType`, `timeWorked`, `customerName`, `assignedToId`, `createdAt`, `updatedAt`, `closedAt`, `escalatedAt` | iguais | iguais | cópia direta |
| `phoneNumber` | obrigatório | **opcional** | cópia direta (safe) |
| `sector` | `String?` livre | **`Sector?` enum** | ⚠️ **mapear** `"TI"→TI`, `"eletrica"/"elétrica"→ELECTRIC`, `"compras"→COMPRAS`; desconhecido → `null` |
| `waJid`, `rating`, `ratedAt`, `awaitingRating`, `type`, `location`, `deletedAt` | não existem | novos | default (`null`/`false`/`SUPPORT`) |

- `Ticket.glpiId` é `@unique` → **chave idempotente** ideal para o ETL (re-rodar não duplica).
- `Ticket.id` (uuid) pode ser **preservado** na migração para manter integridade com `messages`/`attachments`.

### Limpeza — o que existe
- **Manter (não rodam em prod):** todos `*.spec.ts` (backend), `Frontend-chatbot/e2e/` (Playwright),
  `jest.config.js`, `playwright.config.ts`, `settings.seed.ts` (idempotente, seguro).
- **Remover/blindar:**
  - `backend/prisma/seed.ts.disabled` → deletar.
  - `backend/prisma/seeds/e2e-users.seed.ts` → usuários fake com `password123`; **nunca rodar em prod**.
  - `backend/src/presentation/controllers/dev/` (`DevModule`, `/dev/audit-attempt`) → gate por env.
  - `backend/test-intent-bot-integration.ts` → script solto de teste; remover.
- **`.env` NÃO está versionado** (confirmado: só `.env.example` no git, `.env` no `.gitignore`).
  Nenhum vazamento de credencial no repositório. Apenas garantir `.env.production` com segredos fortes.

### Deploy (já documentado em `docs/DEPLOY_PRODUCAO.md`)
- Migrations aplicadas via `npx prisma migrate deploy` (no Dockerfile).
- Postgres persiste em volume nomeado `postgres_data`.
- Merge para main: `git merge --no-ff` (sem squash, sem rebase) — §9 do `IMPLEMENTATION_PLAN_V3.md`.

## 3. Estratégia recomendada (a confirmar)

**Banco novo + ETL apenas de tickets** (alinha com "usuários serão recriados"):
- Sistema novo sobe com banco limpo; você cria os usuários do zero.
- Script ETL lê tickets do banco de produção (`develop`) e insere no banco novo.
- Tickets migrados ficam **sem responsável** (`assignedToId = null`) — reatribuir no sistema novo,
  já que os usuários antigos não existirão.

## 4. Passos de execução

### Fase A — Limpeza da branch ✅ FEITO
1. ✅ Deletados `backend/prisma/seed.ts.disabled` e `backend/test-intent-bot-integration.ts` (via `git rm`).
2. ✅ `DevModule` gateado em `backend/src/app.module.ts` — só carrega quando `NODE_ENV !== 'production'`.
3. ✅ `package.json`: `prisma:seed` e config `prisma.seed` repontados para `seeds/settings.seed.ts`
   (idempotente/seguro), eliminando referência ao `seed.ts` deletado. `seed:e2e` mantido (test-only).
   Adicionado script `migrate:tickets`.
4. ✅ Confirmado: deploy usa `prisma migrate deploy`, que **não** roda seed automaticamente.
   Nenhum seed de demo entra no boot de produção.
5. ✅ `npm test` → **107/107 testes passam (11 suítes)**; `tsc --noEmit` → 0 erros.

### Fase B — Script de migração de tickets (ETL) ✅ FEITO
- Criado `backend/prisma/migrations-data/migrate-tickets-from-prod.ts` (rodar via `npm run migrate:tickets`):
  - Origem via `SOURCE_DATABASE_URL` (banco antigo, lido com SQL bruto — imune ao descasamento de schema);
    destino via `DATABASE_URL`.
  - Migra **tickets** (mapeia `sector` String→enum; `assignedToId=null`; preserva `id`/`glpiId`/`createdAt`/
    `closedAt`/`escalatedAt`) e **mensagens** (`senderId=null`; preserva `id`/`createdAt`).
  - **Idempotente** via `upsert` por `id` (PK preservada) — re-rodar não duplica.
  - Suporta `--dry-run`; loga contagens e valores de `sector` não mapeados.
  - ⚠️ Limitação: `Message.updatedAt`/`Ticket.updatedAt` (`@updatedAt`) recebem a hora da migração — o
    Prisma sempre sobrescreve esse campo na escrita. `createdAt` e demais datas são preservados.
- Validado: typecheck 0 erros; `tsx` carrega e executa (falha só ao conectar em banco dummy — esperado).
- **Antes de rodar em prod:** testar primeiro contra um **dump de cópia** do banco antigo; fazer backup
  (`pg_dump`) do banco novo.

### Fase C — Merge e deploy
1. `git merge origin/main --no-ff` na feature (resolver o 1 commit divergente).
2. Validar suíte de testes + typecheck.
3. Merge `--no-ff` para `main`/branch de produção.
4. Deploy conforme `docs/DEPLOY_PRODUCAO.md`; rodar `prisma migrate deploy`.
5. Rodar o ETL de tickets (Fase B) apontando para o banco de produção antigo como origem.
6. Smoke test: login, listar tickets migrados, criar ticket novo, WhatsApp, push.

## 5. Verificação
- `npm run test` backend verde; typecheck 0 erros.
- ETL em dump de teste: contagem origem == destino; nenhum `sector` perdido sem aviso.
- Pós-deploy: tickets antigos aparecem no sistema novo, sem responsável, com sector correto.
- Backup do banco de produção feito ANTES de qualquer operação.

## 6. Pendências para você (Fase C — fora deste ambiente)
1. **Forward-merge:** `git merge origin/main --no-ff` na `feature/chatbot-upgrade` (resolver o 1 commit divergente).
2. **Deploy:** seguir `docs/DEPLOY_PRODUCAO.md` com `.env.production` (segredos fortes) + `prisma migrate deploy`.
3. **Backup:** `pg_dump` do banco novo antes do ETL; testar o ETL contra um dump de cópia do banco antigo.
4. **Rodar ETL:** `SOURCE_DATABASE_URL=<prod antigo> npm run migrate:tickets -- --dry-run` e depois sem `--dry-run`.
5. **Pós-deploy:** validar tickets migrados (sector correto, sem responsável, histórico de mensagens) e revisar
   no log do ETL os valores de `sector` não mapeados (se houver) para corrigir manualmente.

> Obs. ambiente: `backend/dist/` está com dono `root` (resíduo de build em container) — `nest build` local
> falha ao limpar `dist/`. Não afeta o código; resolver com `sudo rm -rf backend/dist` quando for buildar local.

---

# REFERÊNCIA PARA QUEM VAI EXECUTAR (contexto do sistema novo)

> Esta parte existe para orientar quem nunca operou o sistema novo. Leia antes de mexer em prod.

## 7. Como o sistema novo funciona (visão operacional)

**Stack que sobe no deploy** (`docker-compose.yml`): `postgres`, `redis`, `rabbitmq`, `backend` (NestJS),
`frontend` (builder que popula um volume com o SPA), `nginx` (serve o SPA e faz proxy do `/api`).
O **bot WhatsApp (Baileys) roda DENTRO do backend** — não é container separado. Migrations são aplicadas
no boot do backend via `npx prisma migrate deploy` (no Dockerfile).

**Auth/SSO:** login retorna JWT `{sub, email, role, sector}` em **cookie httpOnly** no domínio pai
`.helpdeskmsm.com.br` → os 3 subdomínios compartilham sessão. Tema do frontend vem do `user.sector` (JWT).

**Como nascem os usuários** (relevante porque o banco vai subir vazio de usuários):
1. **Admin inicial**: criado automaticamente no 1º boot por [auth.service.ts:38](backend/src/presentation/controllers/auth/auth.service.ts#L38)
   a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`. **Em produção, se `ADMIN_PASSWORD` faltar, o
   backend lança erro e não sobe** — defina sempre.
2. **Demais agentes**: o admin cria pelo painel → o sistema dispara **onboarding por link** (email e/ou
   WhatsApp) com um token de ativação (`UserActivationToken`, expira em 1h) → o agente abre o link em
   `APP_PUBLIC_URL` e define a própria senha. Detalhes em [ONBOARDING_AGENTES.md](ONBOARDING_AGENTES.md).

**Canais de atendimento que geram ticket:** (a) **PWA web**, (b) **WhatsApp** (bot Baileys + IA MiniMax
classifica intenção e conduz a conversa), (c) **Email → ticket** (ver §8). Todos caem na mesma tabela
`tickets`. SLA, auto-atribuição, CSAT e push notification são disparados a partir daí.

## 8. Email — DOIS subsistemas independentes (não confundir)

| | **Saída (transacional)** | **Entrada (email → ticket)** |
|---|---|---|
| Serviço | [mail.service.ts](backend/src/infrastructure/mail/mail.service.ts) (nodemailer/SMTP) | [email-ingestion.service.ts](backend/src/infrastructure/email/email-ingestion.service.ts) (IMAP polling) |
| Para que serve | enviar email de **onboarding/ativação** de agente | abrir/atualizar **ticket a partir de email recebido** |
| **Configuração** | **variáveis de ambiente** `SMTP_*` | **registro no banco** (`email_configs`), via API `/email-config` — **NÃO é env** |
| Se não configurado | cai em **modo log-only** (`email DRY-RUN ...` no log; não envia, não quebra) | serviço fica **desabilitado** (`enabled=false`) e não faz polling |
| Idempotência | — | por `Message-Id` do email (`EmailTicketMapping.emailId`); respostas viram mensagem no mesmo ticket via `threadId` |

**Implicações no deploy de banco novo (decisão: banco limpo):**
- **Onboarding por email só funciona se os `SMTP_*` estiverem setados** no `.env.production`. Sem eles, os
  links de ativação não saem por email (só aparecem no log / podem ir por WhatsApp). Configure o SMTP **antes**
  de criar os agentes.
- **A ingestão de email NÃO é migrada** (é config de banco): o registro `email_configs` do sistema antigo não
  vem no ETL. Se você usa email→ticket, **recadastre em `/email-config`** após o deploy (host/porta/usuário/
  senha IMAP, `enabled=true`, `pollInterval`, `defaultSector`, `defaultPriority`).
- Pendência de segurança herdada: `EmailConfig.imapPassword` é gravado **em texto** (há `TODO: Decrypt`) e o
  IMAP usa `rejectUnauthorized:false`. Tratar antes de expor a internet, se relevante.

## 9. Variáveis de ambiente (`.env.production`)

Base: [.env.example](.env.example). `DATABASE_URL`/`REDIS_URL`/`RABBITMQ_URL` são montadas pelo
docker-compose a partir das senhas abaixo (em dev podem ser definidas diretamente).

| Variável | Obrigatória em prod | Para que serve / nota |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | senha do Postgres. `openssl rand -base64 32` |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | ✅ | credenciais RabbitMQ |
| `REDIS_PASSWORD` | ✅ | habilita `requirepass` no compose de prod. `openssl rand -hex 32` |
| `JWT_SECRET` | ✅ | assinatura do JWT. `openssl rand -hex 64` |
| `COOKIE_DOMAIN` | ✅ | `.helpdeskmsm.com.br` (com ponto = SSO entre subdomínios) |
| `COOKIE_SECURE` | ✅ | `true` em prod (HTTPS) |
| `FRONTEND_URL` | ✅ | origens CORS permitidas, separadas por vírgula (os 3 subdomínios) |
| `APP_PUBLIC_URL` | ✅ | base dos links de ativação (sem barra final) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | ✅ (`ADMIN_PASSWORD` faz o boot falhar se faltar) | admin criado no 1º run |
| `MINIMAX_API_KEY` | ✅ | IA primária do bot (intenção, conversa, relatórios) |
| `GLM_API_KEY` / `GLM_API_URL` / `GLM_MODEL` | ⬜ opcional | fallback de IA cloud |
| `REPORT_AI_PROVIDER` | ⬜ | `minimax` \| `glm` (provider do relatório de desempenho) |
| `INTERNAL_API_KEY` | ✅ | header `x-api-key` server-to-server. Trocar do default |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | ✅ (para push PWA) | `npx web-push generate-vapid-keys` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | ⬜ (mas necessário p/ onboarding por email) | envio transacional (§8). Sem eles → log-only |
| `SOURCE_DATABASE_URL` | só no ETL | banco de produção ANTIGO, lido pelo `npm run migrate:tickets` (§4 Fase B) |

> ⚠️ Não existem variáveis `IMAP_*`: a ingestão de email é configurada no banco (`/email-config`), não no `.env`.
> Os `SMTP_*` do `.env` são **só de saída**; o SMTP de *resposta* da ingestão fica no registro `email_configs`.
