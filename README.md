# 🎫 Helpdesk WhatsApp + GLPI

Sistema de help-desk integrado ao WhatsApp com painel web e GLPI.

## ✨ Funcionalidades

- 🤖 **Chatbot** - Primeiro atendimento automatizado via WhatsApp
- 💬 **Chat unificado** - Bot e técnicos na mesma conversa
- 🎫 **GLPI** - Integração com sistema de tickets GLPI
- 📊 **Dashboard** - Visão de tickets e métricas em tempo real
- 👥 **Multi-técnicos** - Login individual por agente
- 🔄 **Filas assíncronas** - RabbitMQ para processamento robusto
- ⚡ **Cache Redis** - Sessões e estado do bot

## 🏗️ Arquitetura

```
WhatsApp (Baileys) → Webhook → Redis → Orchestrator → RabbitMQ → Workers (GLPI/Notify)
```

## 🚀 Início Rápido

```bash
# Copiar configuração
cp .env.example .env

# Subir infraestrutura (PostgreSQL, Redis, RabbitMQ, GLPI)
docker compose up -d postgres redis rabbitmq glpi

# Instalar deps do backend
cd backend && npm install

# Gerar Prisma e migrar banco
npx prisma generate && npx prisma migrate dev

# Iniciar backend
npm run start:dev
```

## ⚙️ Configuração GLPI

1. Acesse http://localhost:8080 e complete instalação
2. Vá em Configuração > Geral > API
3. Habilite API REST e gere tokens
4. Configure no `.env`:

```env
GLPI_APP_TOKEN=seu_app_token
GLPI_USER_TOKEN=seu_user_token
```

## 📁 Estrutura

```
helpdesk-whatsapp/
├── backend/          # NestJS + Clean Architecture
├── frontend/         # Next.js (a ser migrado)
├── bot/              # WhatsApp handlers
├── docs/             # skill.md, playbook.md, agents.md
└── docker-compose.yml
```

## 📄 Licença

Proprietária - Ver LICENSE.md
