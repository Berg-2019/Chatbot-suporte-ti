# 🎫 Helpdesk MSM — Chatbot Suporte TI

Sistema de helpdesk corporativo com **frontend único multi-tenant** servido em 3 subdomínios (TI / Elétrica / Compras) e **Hermes Agent** como brain conversacional do WhatsApp.

> **Fontes da verdade:** [CLAUDE.md](CLAUDE.md) (instruções) e [IMPLEMENTATION_PLAN_V3.md](IMPLEMENTATION_PLAN_V3.md) (plano vigente). Este README é overview de alto nível.

## ✨ Funcionalidades

### 🤖 Hermes Agent (WhatsApp)
- **Conversa natural** — sem menus numerados, diálogo fluido em português
- **Coleta inteligente** — problema, área, setor, localização
- **Integração MiniMax → OpenRouter → Ollama** (failover)
- **Idempotência** via Redis (TTL 24h por `wa_message_id`)

### 🏢 Frontend único, 3 subdomínios
Mesmo build do `profile-driven-app`, tema/abas decididos pelo **JWT** (`user.sector`):

| Subdomínio | Setor | Tema |
|-----------|-------|------|
| `ti.helpdeskmsm.com.br` | TI | Azul (Chatwoot-style) |
| `eletrica.helpdeskmsm.com.br` | Elétrica (NR-10/NR-35) | Dourado |
| `compras.helpdeskmsm.com.br` | Compras | Verde |

### 📊 Backend (NestJS + Prisma, Clean Architecture v2)
- Tickets filtrados server-side por sector (enum, não string livre)
- CMDB nativo (Asset/License) — sem GLPI
- SLA engine + escalation rules
- PurchaseRequests com workflow approve/reject
- SSO via cookie httpOnly em `.helpdeskmsm.com.br`

---

## 🚀 Início Rápido

```bash
git clone https://github.com/Berg-2019/Chatbot-suporte-ti.git
cd Chatbot-suporte-ti
cp .env.example .env   # editar JWT_SECRET, MINIMAX_API_KEY, etc.

# Backend + Hermes + infra
docker compose -f docker-compose.dev.yml up -d \
  postgres redis rabbitmq backend hermes hermes-tools

# QR code WhatsApp (primeira vez)
docker logs -f helpdesk_hermes
```

Frontend (clone do repo Berg-2019/profile-driven-app, gitignored neste repo):

```bash
cd profile-driven-app
bun install
bun run dev:all   # ti=5173, eletrica=5174, compras=5175
```

---

## 🏗️ Arquitetura

```
                  ┌─────────────────────────────────────┐
                  │         NGINX REVERSE PROXY          │
                  │  (Docker, expõe 80/443, wildcard)    │
                  └──┬──────────┬──────────┬──────────┬──┘
                     │ ti.*     │ eletrica.* │ compras.* │ api.*
                     ▼          ▼            ▼            ▼
                  ┌─────────────────────────────┐   ┌──────────┐
                  │  FRONTEND ÚNICO              │   │ BACKEND  │
                  │  (profile-driven-app)        │   │ NestJS   │
                  │  1 build · 3 vhosts          │   │ Clean v2 │
                  │  Tema vem do JWT             │   │          │
                  └──────────────────────────────┘   └────┬─────┘
                                                          │
                                              ┌─────────┬─┴───────┬──────────┐
                                              │Postgres │  Redis  │ RabbitMQ │
                                              └─────────┴─────────┴────┬─────┘
                                                                       ▼
                                                            ┌────────────────────┐
                                                            │   HERMES AGENT      │
                                                            │ (Baileys WhatsApp)  │
                                                            └────────────────────┘
```

Detalhes em [CLAUDE.md](CLAUDE.md#🏗️-arquitetura-v3).

---

## 📁 Estrutura

```
Chatbot-suporte-ti/
├── backend/                 # NestJS + Prisma (Clean Architecture v2)
├── hermes-agent/            # Hermes (submodule)
├── hermes-integration/      # Bridge HTTP + skills custom
├── nginx/                   # vhosts ti.* / eletrica.* / compras.* / api.*
├── docker-compose.yml       # produção
├── docker-compose.dev.yml   # dev
├── docker-compose.staging.yml
├── helpdesk.sh              # script de gerenciamento
├── CLAUDE.md                # instruções
├── IMPLEMENTATION_PLAN_V3.md
└── profile-driven-app/      # frontend (clone do repo Berg-2019/profile-driven-app, gitignored)
```

---

## 🛣️ Portas

| Serviço | Dev | Produção |
|---------|-----|----------|
| Backend | 3000 | `api.helpdeskmsm.com.br` |
| Hermes Agent | 3004 | Interno |
| Hermes Tools | 3003 | Interno |
| Frontend (Bun dev) | 5173/5174/5175 | `ti./eletrica./compras.helpdeskmsm.com.br` |
| PostgreSQL | 5432 | Interno |
| Redis | 6379 | Interno |
| RabbitMQ | 5672/15672 | Interno |

---

## 🔄 Fluxo de Atendimento

```
Cliente (WhatsApp) → Hermes Agent (Baileys + IA)
        → helpdesk-conversation (orquestra)
        → bridge HTTP → Backend (cria ticket, liga a asset, dispara SLA)
        → Técnico recebe push + WhatsApp
```

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [CLAUDE.md](CLAUDE.md) | Instruções para Claude Code (fonte da verdade) |
| [IMPLEMENTATION_PLAN_V3.md](IMPLEMENTATION_PLAN_V3.md) | Plano de implementação vigente |
| [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) | Checklist operacional |
| [AGENTS.md](AGENTS.md) | Armadilhas conhecidas |
| [hermes-integration/README.md](hermes-integration/README.md) | Integração Hermes |

---

## 🛠️ Comandos Úteis

```bash
./helpdesk.sh dev                  # sobe ambiente dev
./helpdesk.sh logs backend         # logs do backend
./helpdesk.sh shell hermes         # shell do Hermes
./helpdesk.sh migrate              # Prisma migrations

docker logs -f helpdesk_hermes     # acompanhar WhatsApp
curl http://localhost:3003/health  # health check bridge
```

---

## 📄 Licença

Proprietária — Ver [LICENSE.md](LICENSE.md)
