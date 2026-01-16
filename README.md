# 🎫 Helpdesk WhatsApp + GLPI

Sistema de atendimento técnico integrado ao WhatsApp com painel administrativo e GLPI.

## ✨ Funcionalidades

### Bot WhatsApp
- 🤖 **Chatbot** - Primeiro atendimento automatizado
- 💬 **Chat unificado** - Bot e técnicos na mesma conversa
- 📱 **Multi-sessão** - Suporte a múltiplos atendimentos simultâneos

### Painel Administrativo
- 📊 **Dashboard** - Métricas em tempo real com gráficos
- 👥 **Gestão de Usuários** - Criar usuários integrados ao GLPI
- 📈 **Relatórios** - Exportação CSV, filtros por data
- 🤖 **Configurar Bot** - Mensagens e horários de atendimento
- 📦 **Estoque** - Controle de peças e equipamentos
- ❓ **FAQ** - Base de conhecimento

### Integrações
- 🎫 **GLPI** - Sincronização de tickets e usuários
- 🔄 **Filas RabbitMQ** - Processamento assíncrono
- ⚡ **Cache Redis** - Sessões e estado

### Níveis Técnicos
- 🏷️ **N1, N2, N3** - Classificação automática por grupos GLPI
- ⏱️ **SLA Monitoring** - Escalonamento automático

---

## 🚀 Início Rápido

### Usando o Script (Recomendado)

```bash
# Clonar projeto
git clone <repo> && cd Chatbot-suporte-ti

# Copiar configuração
cp .env.example .env
# Edite o .env com suas configurações

# Modo Desenvolvimento (local)
./setup.sh dev

# Modo Produção (Docker)
./setup.sh prod
```

### Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `./setup.sh dev` | Inicia em modo desenvolvimento (npm local) |
| `./setup.sh prod` | Inicia em modo produção (Docker) |
| `./setup.sh stop` | Para todos os serviços |
| `./setup.sh logs` | Mostra logs dos containers |
| `./setup.sh status` | Status dos serviços |

### Manual (Desenvolvimento)

```bash
# Terminal 1 - Backend
cd backend && npm install && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev

# Terminal 3 - Bot
cd bot && npm install && node src/index.js
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/helpdesk

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@localhost:5672

# JWT
JWT_SECRET=sua-chave-secreta

# GLPI
GLPI_URL=http://localhost:8080/apirest.php
GLPI_APP_TOKEN=seu_app_token
GLPI_USER_TOKEN=seu_user_token

# Frontend (produção)
NEXT_PUBLIC_API_URL=https://bk.seudominio.com.br
```

### Configuração GLPI

1. Acesse GLPI → Configuração → Geral → API
2. Habilite API REST
3. Gere App Token e User Token
4. Configure no `.env`

### Grupos GLPI para Níveis

Crie os seguintes grupos no GLPI:
- `Tecnicos > Tecnico L1` → Nível N1
- `Tecnicos > Tecnico L2` → Nível N2  
- `Tecnicos > Tecnico L3` → Nível N3
- `Admin` → Role ADMIN
- `Estoque` → Role ADMIN

---

## 🏗️ Arquitetura

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  WhatsApp   │───▶│    Bot      │───▶│   Backend   │
│  (Baileys)  │    │  (Node.js)  │    │  (NestJS)   │
└─────────────┘    └─────────────┘    └──────┬──────┘
                                              │
                   ┌──────────────────────────┼──────────────────────────┐
                   │                          │                          │
              ┌────▼────┐              ┌──────▼──────┐            ┌──────▼──────┐
              │  Redis  │              │ PostgreSQL  │            │    GLPI     │
              │ (Cache) │              │   (Dados)   │            │  (Tickets)  │
              └─────────┘              └─────────────┘            └─────────────┘
```

---

## 📁 Estrutura do Projeto

```
Chatbot-suporte-ti/
├── backend/           # API NestJS (Clean Architecture)
│   ├── src/
│   │   ├── domain/           # Entities, DTOs
│   │   ├── infrastructure/   # Database, External APIs
│   │   └── presentation/     # Controllers, Gateways
│   └── prisma/               # Schema e migrations
│
├── frontend/          # Interface Next.js
│   ├── app/
│   │   ├── admin/           # Painel administrativo
│   │   ├── dashboard/       # Dashboard técnicos
│   │   └── login/           # Autenticação
│   └── components/          # Componentes reutilizáveis
│
├── bot/               # Bot WhatsApp
│   └── src/
│       ├── handlers/        # Processamento mensagens
│       └── services/        # GLPI, RabbitMQ
│
├── nginx/             # Configurações Nginx
├── docker-compose.yml         # Full stack
├── docker-compose.prod.yml    # Apenas app (produção)
├── setup.sh                   # Script de gerenciamento
└── .env.example               # Template de configuração
```

---

## 🌐 Portas

| Serviço | Desenvolvimento | Produção (Docker) |
|---------|-----------------|-------------------|
| Backend | 3000 | 4000 |
| Frontend | 3001 | 4001 |
| GLPI | 8080 | 8080 |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| RabbitMQ | 5672 / 15672 | 5672 / 15672 |

---

## 📄 Licença

Proprietária - Ver [LICENSE.md](LICENSE.md)
