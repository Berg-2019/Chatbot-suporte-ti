# 🎫 Helpdesk WhatsApp — MSM Sistema

Sistema de helpdesk corporativo com **3 frontends separados** por área e **Hermes Agent** como brain conversacional humanizado.

## ✨ Funcionalidades

### 🤖 Hermes Agent (WhatsApp Bot)
- **Conversa natural** — Sem menus numerados, diálogo fluido em português
- **Coleta inteligente** — Problema, área, setor, localização, nome
- **Integração MiniMax** — IA generativa para respostas humanizadas
- **Escalação automática** — Transfere para humano quando necessário

### 🏢 Multi-Frontend (3 áreas)

| Frontend | Propósito | Tema |
|----------|-----------|------|
| **TI** | Técnicos de suporte | Chatwoot-style (dark blue) |
| **Elétrica** | Técnicos de campo (NR-10/NR-35) | Gold (#FFC700) |
| **Compras** | Aprovações e requisições | Green (#22C55E) |

### 📊 Backend (NestJS + Prisma)
- Tickets filtrados por setor
- Stock unificado (TI + Elétrica)
- PurchaseRequests (workflow de compras)
- Auth SSO com JWT

---

## 🚀 Início Rápido

### 1. Configurar Ambiente

```bash
# Clonar e entrar no projeto
git clone https://github.com/Berg-2019/Chatbot-suporte-ti.git
cd Chatbot-suporte-ti

# Copiar variáveis
cp .env.example .env
# Editar .env com suas chaves (MINIMAX_API_KEY, etc)

# Subir serviços principais
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq backend hermes hermes-tools
```

### 2. Escanear QR Code (primeira vez)

```bash
docker logs -f helpdesk_hermes
# Escaneie o QR code quando aparecer

# Ou via exec
docker exec -it helpdesk_hermes hermes whatsapp
```

### 3. Acessar Frontends

```bash
# Frontend TI (em desenvolvimento)
# Acesse http://localhost:5173

# Frontend Elétrica (suport-eletric repo)
# Acesse http://localhost:8080

# Frontend Compras (a criar)
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS + Prisma)                        │
│   Auth (SSO/JWT) │ Tickets │ Stock │ Purchases │ PurchaseRequests      │
└─────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   FRONTEND TI   │  │ FRONTEND ELÉTR  │  │ FRONTEND COMPRAS│
│  support-mobile │  │  suport-eletric │  │ support-compras │
│   (Chatwoot)    │  │    (Gold)       │  │    (Green)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                     Hermes Agent (WhatsApp Bot)
                              │
                    ┌─────────┴─────────┐
                    │   MiniMax/M2     │
                    │   (IA Provider)  │
                    └──────────────────┘
```

### Fluxo de Atendimento

```
Cliente (WhatsApp)
       │
       ▼
Hermes Agent (IA conversacional)
       │
       ├─► Skill: helpdesk-conversation
       │         │
       │         ├─► Coleta dados (natural)
       │         ├─► Cria ticket no backend
       │         └─► Escala se necessário
       │
       ▼
Backend (NestJS)
       │
       ├─► Ticket criado
       ├─► WebSocket notification
       │
       ▼
Técnico (Frontend TI ou Elétrica)
       │
       ▼
Se necesita compra ──► PurchaseRequest ──► Compras (Frontend)
```

---

## 📁 Estrutura do Projeto

```
Chatbot-suporte-ti/
├── backend/                 # API NestJS (Clean Architecture)
│   ├── src/
│   │   ├── domain/        # Entities, DTOs, interfaces
│   │   ├── infrastructure/ # Database, External APIs
│   │   └── presentation/ # Controllers, Gateways
│   └── prisma/schema.prisma
│
├── frontend/               # Legacy (referência)
│
├── bot/                    # Legacy (flow-handler.js)
│
├── hermes-agent/           # Hermes Agent (submodule)
│   └── skills/
│
├── hermes-integration/     # Integração Hermes
│   ├── backend-tools/      # Bridge server (Node.js)
│   ├── config/            # Configurações
│   └── skills/            # Skills helpdesk
│
├── docker-compose.yml      # Produção
├── docker-compose.dev.yml  # Desenvolvimento
└── CLAUDE.md               # Este arquivo
```

---

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# MiniMax (Provider IA)
MINIMAX_API_KEY=sua_chave_minimax

# Hermes
HERMES_API_KEY=sua_chave_hermes
HERMES_BACKEND_URL=http://hermes-tools:3003

# Backend
DATABASE_URL=postgresql://helpdesk:helpdesk123@postgres:5432/helpdesk
JWT_SECRET=sua_chave_jwt

# GLPI
GLPI_URL=http://glpi/apirest.php
GLPI_APP_TOKEN=seu_token
GLPI_USER_TOKEN=seu_token
```

### Portas

| Serviço | Dev | Produção |
|---------|-----|----------|
| Backend | 3000 | https://helpdeskmsm.com.br/api |
| Hermes Agent | 3004 | Interno |
| Hermes Tools | 3003 | Interno |
| Frontend TI | 5173 | https://helpdeskmsm.com.br |
| GLPI | 8080 | https://glpi.helpdeskmsm.com.br |
| PostgreSQL | 5432 | Interno |
| Redis | 6379 | Interno |
| RabbitMQ | 5672/15672 | Interno |

---

## 📋 Repositórios dos Frontends

| Repo | Descrição | Status |
|------|-----------|--------|
| `support-mobile` (branch: `feature/frontend-ti`) | Frontend TI | Em desenvolvimento |
| `suport-eletric` | Frontend Elétrica | Existente |
| `support-compras` | Frontend Compras | **A criar** |

---

## 🔄 Fluxo de Requisição de Compra

```
1. Técnico fecha ticket que necessita compra
2. Técnico cria PurchaseRequest via frontend
3. Compras recebe notificação (WebSocket)
4. Compras aprova ou rejeita
5. Se aprovado → registra Purchase
6. Técnico é notificado
```

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| `CLAUDE.md` | Instruções para Claude Code |
| `IMPLEMENTATION_PLAN_V2.md` | Plano de implementação multi-frontend |
| `hermes-integration/README.md` | Guia de integração Hermes |
| `hermes-integration/skills/helpdesk-conversation/SKILL.md` | Skill de conversa natural |

---

## 🛠️ Comandos Úteis

```bash
# Subir todos os serviços
docker compose -f docker-compose.dev.yml up -d

# Ver logs do Hermes
docker logs -f helpdesk_hermes

# Ver logs do Hermes Tools
docker logs -f helpdesk_hermes_tools

# Reiniciar Hermes
docker restart helpdesk_hermes

# Acessar shell do Hermes
docker exec -it helpdesk_hermes /bin/bash

# Health check
curl http://localhost:3003/health
```

---

## 📄 Licença

Proprietária — Ver [LICENSE.md](LICENSE.md)
