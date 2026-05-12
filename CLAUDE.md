# CLAUDE.md — Chatbot-suporte-ti

> Instruções para o Claude Code trabalhar neste projeto.
> 🚨 **LEIA PRIMEIRO:** [`HANDOFF.md`](HANDOFF.md) — snapshot atual da stack, pendentes priorizados, armadilhas conhecidas, comandos prontos.
> **Plano vigente:** [`IMPLEMENTATION_PLAN_V3.md`](IMPLEMENTATION_PLAN_V3.md) — toda decisão de arquitetura, fase e prioridade vem de lá.
> **Estado operacional:** [`IMPLEMENTATION_CHECKLIST.md`](IMPLEMENTATION_CHECKLIST.md) — checklist e indicadores atualizados.
> **Armadilhas conhecidas:** [`AGENTS.md`](AGENTS.md) (HANDOFF.md amplia com casos novos).
> Última atualização: 2026-05-12

## 📌 Estado atual (snapshot 2026-05-04)

- **Fases 0-5** ✅ completas; **Fase 6** 🔄 em progresso (tarefas pendentes executadas 2026-05-04)
- **Stack rodando E2E localmente** — backend/Hermes/frontend/postgres/redis/rabbitmq operacionais
- **WhatsApp pareado** — confirmado 2026-05-04 via logs `helpdesk_hermes`
- **165 commits ahead de main** — aguardando janela de 1-2 sem para merge `--no-ff` (sem squash, sem rebase). Detalhe em [§9 do plano](IMPLEMENTATION_PLAN_V3.md)
- **Bloqueadores pré-merge restantes:** forward-merge `git merge origin/main`, Playwright E2E suite, smoke test mobile real

---

## 🎯 Sobre o Projeto

Sistema de helpdesk corporativo com **frontend único multi-tenant servido em 3 subdomínios** por área:

- `ti.helpdeskmsm.com.br` — Técnicos de TI (tema azul)
- `eletrica.helpdeskmsm.com.br` — Técnicos elétricos NR-10/NR-35 (tema dourado)
- `compras.helpdeskmsm.com.br` — Setor de compras / requisições (tema verde)
- `api.helpdeskmsm.com.br` — Backend NestJS (compartilhado)

**Mesmo build do frontend, 3 vhosts no nginx.**

> **Decisão 2026-05-10 — PWA único.** Tema/abas/dados vêm do **JWT (`user.sector`)**, não do host. Manifest é um só (`/public/manifest.webmanifest`). Os 3 subdomínios continuam servindo o mesmo app por conveniência de URL/SSO, mas o usuário instala apenas **1 PWA** no celular. Sem redirect entre subdomínios após login. `SectorSwitcher` existe apenas em build DEV (`import.meta.env.DEV`) para previewar temas — em produção retorna `null`.

**WhatsApp** como canal alternativo de atendimento, com **Hermes Agent** como brain conversacional. **Bot legado (`bot/`) será removido** na Fase 1 — não usar.

**Repositórios:**
- Backend (este repo): https://github.com/Berg-2019/Chatbot-suporte-ti — branch atual `feature/chatbot-upgrade`
- Frontend único: https://github.com/Berg-2019/Frontend-chatbot (TanStack Start + React 19 + Tailwind 4 + Bun) — clonado em `./Frontend-chatbot/` (raiz deste repo, gitignored)
- Produção: https://*.helpdeskmsm.com.br (wildcard cert Let's Encrypt DNS-01)

---

## 🏗️ Arquitetura V3

```
                  ┌─────────────────────────────────────┐
                  │         NGINX REVERSE PROXY          │
                  │  (Docker, expõe 80/443, wildcard)    │
                  └──┬──────────┬──────────┬──────────┬──┘
                     │ ti.*     │ eletrica.* │ compras.* │ api.*
                     ▼          ▼            ▼            ▼
                  ┌─────────────────────────────┐   ┌──────────┐
                  │  FRONTEND (1 build, mesmo    │   │ BACKEND  │
                  │  container, 3 vhosts no nginx)│   │ NestJS   │
                  │                              │   │  Clean   │
                  │  Tema vem do JWT             │   │  Arch v2 │
                  │  PWA único (1 manifest)      │   │          │
                  │  PWA mobile-first            │   │          │
                  └──────────────────────────────┘   └────┬─────┘
                              ▲                            │
                              │ Cookie httpOnly em         │
                              │ .helpdeskmsm.com.br        │
                              │ (SSO entre subdomínios)    │
                                                           ▼
                                              ┌─────────┬─────────┬──────────┐
                                              │Postgres │ Redis   │ RabbitMQ │
                                              │(Prisma, │(cache,  │(events,  │
                                              │sem GLPI)│SLA timer│push)     │
                                              └─────────┴─────────┴────┬─────┘
                                                                       │
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │   HERMES AGENT      │
                                                            │ (única integração   │
                                                            │  WhatsApp/Baileys)  │
                                                            └────────────────────┘
```

### Decisões irrevogáveis do V3 (não revisitar sem novo plano)

| Decisão | Status |
|---------|--------|
| Estratégia: evoluir o backend atual (não recriar do zero) | ✅ |
| **Remover GLPI** — substituir por CMDB nativo + SLA + License | ✅ |
| **Remover bot legado** (`bot/`) — Hermes 100% no WhatsApp | ✅ |
| Frontend único (`Frontend-chatbot`) servido em 3 subdomínios | ✅ |
| SSO via cookie httpOnly em `.helpdeskmsm.com.br` | ✅ |
| Sem Cloudflare — tudo local com Docker | ✅ |
| **PWA mobile-first** (câmera, QR scanner, push, offline real) | ✅ |
| Sector como `enum`, não `String` livre | ✅ |
| `application/` (use cases) entre `presentation/` e `domain/` | ✅ |

---

## 🛣️ Portas

| Serviço | Dev | Produção |
|---------|-----|----------|
| Backend NestJS | 3000 | `api.helpdeskmsm.com.br` |
| Frontend TI (Bun dev) | 5173 | `ti.helpdeskmsm.com.br` |
| Frontend Elétrica (Bun dev) | 5174 | `eletrica.helpdeskmsm.com.br` |
| Frontend Compras (Bun dev) | 5175 | `compras.helpdeskmsm.com.br` |
| Hermes Agent | 3004 | Interno |
| Hermes Tools (bridge) | 3003 | Interno |
| nginx | — | 80/443 (wildcard `*.helpdeskmsm.com.br`) |
| PostgreSQL | 5432 | Interno |
| Redis | 6379 | Interno |
| RabbitMQ | 5672 / 15672 | Interno |

> **GLPI já não consta** — será removido na Fase 1. Não usar `GLPI_URL`/`GLPI_APP_TOKEN`/`GLPI_USER_TOKEN` em código novo.

---

## 📁 Estrutura do Projeto

```
Chatbot-suporte-ti/                 ← este repo
├── backend/                         # NestJS (Clean Architecture v2)
│   ├── src/
│   │   ├── presentation/            # controllers, gateways
│   │   ├── application/             # use cases (a CRIAR — Fase 0/2/3/4)
│   │   ├── domain/                  # entities, DTOs, interfaces
│   │   └── infrastructure/          # Prisma, Redis, RabbitMQ, SLA, etc.
│   └── prisma/schema.prisma         # ⚠️ fonte da verdade
│
├── hermes-agent/                    # Hermes (submodule)
│   └── skills/
├── hermes-integration/              # Bridge + skills custom
│   ├── backend-tools/server.js      # Bridge HTTP
│   ├── config/
│   └── skills/
│       ├── helpdesk-create-ticket/
│       ├── helpdesk-check-status/
│       ├── helpdesk-escalate/
│       ├── helpdesk-faq/
│       ├── helpdesk-reserve-equipment/
│       └── helpdesk-conversation/   # ← a CRIAR (Fase 5)
│
├── nginx/                           # vhosts ti.* / eletrica.* / compras.* / api.*
├── docker-compose.yml               # produção
├── docker-compose.dev.yml           # dev (sem bot/, sem glpi/)
├── docker-compose.staging.yml       # smoke test multi-subdomínio (Fase 6)
├── helpdesk.sh                      # script de gerenciamento
├── .env.example
│
├── IMPLEMENTATION_PLAN_V3.md        # ← plano vigente
├── Frontend-chatbot/              # ← frontend (repo Berg-2019/Frontend-chatbot, gitignored)
└── CLAUDE.md                        # ← este arquivo
```

> **Frontend agora vive DENTRO deste repo** (em `Frontend-chatbot/`), gitignored — é um clone do repo `Berg-2019/Frontend-chatbot`. Decisão tomada em 2026-05-11 após reset completo do frontend para reiniciar a Fase 6 do zero.

> **`bot/` será deletado** na Fase 1. **`frontend/` legado** já foi removido. **`glpi.service.ts` e `glpi-sync.service.ts`** serão deletados na Fase 1.

---

## 🛠️ Stack Técnica

### Backend
- NestJS (TypeScript) + Prisma + PostgreSQL
- Redis (cache + SLA timers + idempotência WhatsApp)
- RabbitMQ (events + push notifications + WhatsApp queue)
- JWT com `{sub, email, sector, role}` no payload
- Cookie httpOnly em `.helpdeskmsm.com.br`, SameSite=Lax, Secure
- CORS aceita as 3 origens dos subdomínios + `credentials: true`
- WebSocket Socket.IO para tempo real
- **Clean Architecture v2** com 4 camadas: `presentation/` → `application/` → `domain/` → `infrastructure/`

### Frontend (`Frontend-chatbot`)
- **TanStack Start** (React 19 + TanStack Router file-based + Vite)
- **Tailwind 4** + shadcn/ui (Radix UI)
- React Hook Form + Zod
- TanStack Query 5 + axios (`withCredentials: true`)
- **Bun** como package manager (não npm/yarn)
- Build SPA estático servido por nginx (não SSR Node)
- **PWA mobile-first** com Workbox (`vite-plugin-pwa`)

### Bot / IA
- **Hermes Agent** = único brain conversacional do WhatsApp
- WhatsApp via Baileys (dentro do Hermes)
- Skills: `helpdesk-conversation` (orquestrador) + 5 skills atômicas
- Bridge HTTP em `hermes-integration/backend-tools/server.js`
- Provider: MiniMax (primário) → OpenRouter (fallback) → Ollama (failover)
- Idempotência WhatsApp via Redis (TTL 24h por `wa_message_id`)

---

## 📐 Convenções de Código

### Geral
- **Idioma do código:** Inglês
- **Idioma do conteúdo/UI:** Português brasileiro
- Indentação: 2 espaços · `;` no fim · aspas simples no TS/JS

### Backend (NestJS) — padrão Clean v2

```typescript
// Controller: fino, só HTTP. NUNCA importa PrismaService direto.
@Controller('tickets')
@UseGuards(JwtAuthGuard, SectorGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly findTickets: FindTicketsUseCase) {}

  @Get()
  @RequireSector()                  // Fase 0: aplicar este guard
  async findAll(@Query() query: FindTicketsQueryDto, @CurrentUser() user: User) {
    return this.findTickets.execute({ ...query, sector: user.sector }); // server-side
  }
}

// Use Case: orquestra regra de negócio, sem HTTP, sem Prisma direto.
@Injectable()
export class FindTicketsUseCase {
  constructor(private readonly tickets: TicketsRepository) {}
  async execute(input: FindTicketsInput) { /* ... */ }
}

// Repository: única camada que toca Prisma.
@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}
  /* ... */
}
```

### Frontend (TanStack Router file-based)

```typescript
// src/routes/_authed/tickets/index.tsx
export const Route = createFileRoute('/_authed/tickets/')({
  beforeLoad: ({ context }) => {
    if (!['TI', 'ELECTRIC'].includes(context.user.sector)) throw redirect({ to: '/' });
  },
  component: TicketsList,
});
```

Tema vem do **JWT** (`user.sector`). `detectSectorFromHost()` permanece em [Frontend-chatbot/src/lib/sector.ts](Frontend-chatbot/src/lib/sector.ts) apenas como **fallback pré-login** (tela de `/login` antes do `useAuth().sector` estar disponível):

```typescript
// src/contexts/ThemeContext.tsx
const { sector: userSector } = useAuth();
useEffect(() => {
  const next = userSector ?? detectSectorFromHost();
  document.documentElement.setAttribute("data-sector", next);
}, [userSector]);
```

---

## 🔐 Autenticação SSO

JWT no payload:

```typescript
{
  sub: userId,
  email: string,
  role: "ADMIN_TI" | "ADMIN_ELECTRIC" | "ADMIN_COMPRAS" | "AGENT" | "ADMIN",
  sector: "TI" | "ELECTRIC" | "COMPRAS",     // ENUM (não String livre)
  iat, exp
}
```

Cookie:
```
Set-Cookie: helpdesk_session=<jwt>;
            Domain=.helpdeskmsm.com.br;       ← domínio pai = SSO
            Path=/; HttpOnly; Secure;
            SameSite=Lax
```

**Validação cruzada (defesa em profundidade):** todo middleware autenticado compara `Host` da request com `user.sector`. Se técnico TI tenta acessar `compras.helpdeskmsm.com.br`, backend retorna 403 e frontend redireciona para `ti.helpdeskmsm.com.br`.

### Acesso por subdomínio

| Subdomínio | Sector | Acessa |
|-----------|--------|--------|
| `ti.helpdeskmsm.com.br` | TI | tickets TI, assets TI, KB, requisições próprias |
| `eletrica.helpdeskmsm.com.br` | ELECTRIC | tickets ELECTRIC, assets ELECTRIC, safety NR, tool loans |
| `compras.helpdeskmsm.com.br` | COMPRAS | todas as PurchaseRequests, fornecedores, relatórios |

---

## 🚀 Como Iniciar Desenvolvimento

### 1. Backend + Hermes + infra

```bash
# Subir serviços principais (sem bot, sem glpi)
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq backend hermes hermes-tools

# Logs
docker logs -f helpdesk_hermes

# QR code WhatsApp (primeira vez)
docker exec -it helpdesk_hermes hermes whatsapp
```

### 2. Frontend (`Frontend-chatbot`, gitignored dentro deste repo)

```bash
cd Frontend-chatbot        # ← no root deste repo
bun install                  # ⚠️ Bun, não npm

# Subir os 3 frontends em portas diferentes (simulando subdomínios)
bun run dev:all              # ti=5173, eletrica=5174, compras=5175

# OU individualmente:
bun run dev:ti
bun run dev:electric
bun run dev:compras
```

### 3. Smoke test multi-subdomínio (antes de releases)

```bash
# Adicionar ao /etc/hosts:
# 127.0.0.1 ti.helpdeskmsm.local eletrica.helpdeskmsm.local compras.helpdeskmsm.local api.helpdeskmsm.local

docker compose -f docker-compose.staging.yml up
# Acessar https://ti.helpdeskmsm.local etc — testa cookie SSO entre subdomínios
```

---

## 📝 Fluxo de Atendimento

### Via WhatsApp (Hermes Agent)

```
Cliente envia msg → Hermes (Baileys) → skill helpdesk-conversation
    → Hermes consulta KB via captain-assistant (auto-resolve tier-1)
    → Se não resolve: conversa para coletar dados
    → Cria ticket via bridge (POST /api/tickets)
    → Liga ticket ao Asset se reconhecer (escaneou QR ou citou patrimônio)
    → SLA timer dispara → técnico recebe push + WhatsApp
```

### Hermes Skills

- `helpdesk-conversation` — orquestrador (Fase 5, a criar)
- `helpdesk-create-ticket` — atômica, cria ticket
- `helpdesk-check-status` — atômica, status de ticket
- `helpdesk-escalate` — atômica, escala
- `helpdesk-faq` — atômica, busca KB
- `helpdesk-reserve-equipment` — atômica, reserva equipamento

**NÃO USA MENUS NUMERADOS** — conversa natural em português brasileiro.

---

## 📦 Backend — Endpoints Principais

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| POST | `/auth/login` | SSO | Público |
| POST | `/auth/logout` | Limpa cookie | JWT |
| GET | `/tickets` | Lista (filtro server-side por sector) | TI/ELECTRIC |
| POST | `/tickets` | Criar (com `affectedAssetId` opcional) | TI/ELECTRIC/AGENT |
| GET | `/assets` | Lista CMDB | TI/ELECTRIC/ADMIN |
| POST | `/assets/:id/assign` | Atribuir asset a usuário | ADMIN_* |
| GET | `/assets/scan/:tag` | Resolver tag (QR scanner mobile) | TI/ELECTRIC |
| POST | `/purchase-requests` | Criar requisição | TI/ELECTRIC/AGENT |
| GET | `/purchase-requests` | Lista (todas para COMPRAS, próprias para outros) | TI/ELECTRIC/COMPRAS |
| PATCH | `/purchase-requests/:id/approve` | Aprovar | ADMIN_COMPRAS |
| PATCH | `/purchase-requests/:id/reject` | Rejeitar (com motivo) | ADMIN_COMPRAS |
| GET | `/sla/policies` | Políticas SLA | ADMIN_* |
| GET | `/sla/dashboard` | Métricas | ADMIN_* |
| POST | `/push/subscribe` | Inscrever PWA para push | JWT |

---

## 📋 Fases (do `IMPLEMENTATION_PLAN_V3.md`)

| Fase | Conteúdo | Estimativa |
|------|---------|------------|
| **0** | Estabilização: rebase, fix IDOR, JWT com sector, sector→enum | 1 sem |
| **1** | Remover bot legado + remover GLPI dos 14 arquivos | 1 sem |
| **2** | CMDB nativo: Asset, AssetAssignment, License, LicenseAssignment | 1 sem |
| **3** | SLA Engine: SlaPolicy, BusinessHours, SlaTimer, EscalationRule | 1 sem |
| **4** | PurchaseRequest CRUD + workflow approve/reject | 1 sem |
| **5** | Hermes orchestration: skill helpdesk-conversation + idempotência WA | 1 sem |
| **6** | Frontend `Frontend-chatbot` + 3 subdomínios + PWA mobile | 2-3 sem |
| | **Total** | **8-9 sem** |

Sequência **importa** — Fase 0 destrava todas as outras (rebase + segurança). Fases 2-4 podem rodar levemente em paralelo se houver mais de 1 dev. Fase 6 só começa após 4.

---

## ⚠️ Regras Importantes

### NUNCA fazer:
- Hardcode de credenciais (sempre `.env`)
- Modificar `schema.prisma` sem criar migration
- Commitar `node_modules/`, `.env`, `dist/`
- **Reintroduzir GLPI** ou referenciar `glpi.service.ts` em código novo
- **Reintroduzir bot legado** ou rodar `bot/` junto com Hermes
- Voltar a 3 frontends separados — é 1 código, 3 subdomínios
- Aceitar `sector` como string livre — é enum em todos os lugares
- Token em `localStorage` — é cookie httpOnly
- Importar `PrismaService` em controller — passar por `application/` (use case)

### SEMPRE fazer:
- Aplicar `SectorGuard` nos endpoints filtrados por sector
- Validar `sector` server-side a partir do JWT, **ignorar** query param do cliente
- Validar `Host` da request vs `user.sector` em endpoints sensíveis
- DTOs com `class-validator` decorators
- `@@index` em campos de `WHERE`/`ORDER BY` no Prisma
- Logger do NestJS, não `console.log`
- `withCredentials: true` no axios (SSO via cookie)
- Compressão client-side de fotos antes do upload (foto de celular satura rede)
- Service Worker registrado só em `import.meta.env.PROD`

---

## 🔑 Variáveis de Ambiente Essenciais

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/helpdesk

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672

# JWT + Cookie SSO
JWT_SECRET=<gerar com `openssl rand -hex 64`>
JWT_EXPIRES_IN=8h
COOKIE_DOMAIN=.helpdeskmsm.com.br      # PARENT domain — não esquecer o ponto
COOKIE_SECURE=true                     # false só em dev local
CORS_ORIGINS=https://ti.helpdeskmsm.com.br,https://eletrica.helpdeskmsm.com.br,https://compras.helpdeskmsm.com.br

# Hermes / IA
HERMES_API_KEY=...
MINIMAX_API_KEY=...
OPENROUTER_API_KEY=...

# Push (PWA)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:dev@helpdeskmsm.com.br
```

> **GLPI vars (`GLPI_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN`) serão removidas na Fase 1.** Não introduzir em features novas.

---

## 📚 Documentos de Referência

| Documento | Descrição |
|-----------|-----------|
| [`IMPLEMENTATION_PLAN_V3.md`](IMPLEMENTATION_PLAN_V3.md) | **Plano vigente** — ler antes de começar qualquer fase |
| `hermes-integration/README.md` | Guia da integração Hermes |
| `hermes-integration/skills/helpdesk-conversation/SKILL.md` | Skill de conversa natural (a criar — Fase 5) |
| `nginx/sites-enabled/helpdeskmsm.conf` | Config dos 4 vhosts (a criar — Fase 6) |

---

## 📌 Quick Reference

1. **Sempre consultar [IMPLEMENTATION_PLAN_V3.md](IMPLEMENTATION_PLAN_V3.md)** antes de implementar nova feature.
2. **Filtro por sector é server-side** sempre — nunca confiar em query param do cliente.
3. **Hermes Agent** é o único brain do WhatsApp — bot legado será deletado.
4. **GLPI é legado** — não criar dependência nova; remover na Fase 1.
5. **Frontend é 1 código, 1 PWA, 3 subdomínios servem o mesmo build** — tema vem do **JWT** (`user.sector`), não do host (decisão 2026-05-10).
6. **PWA mobile-first** — câmera, QR, push, offline real são requisitos da Fase 6, não nice-to-have.
7. **SSO** via cookie em `.helpdeskmsm.com.br` — backend e os 3 frontends compartilham auth.
8. **Sector é enum**, não String. **Roles** são `ADMIN_TI`/`ADMIN_ELECTRIC`/`ADMIN_COMPRAS`/`AGENT`/`ADMIN`.
