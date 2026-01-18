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

# Instalar dependências
./helpdesk.sh install

# Modo Desenvolvimento (Docker com hot-reload)
./helpdesk.sh dev

# Modo Produção (Docker)
./helpdesk.sh prod
```

### Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `./helpdesk.sh install` | Instala dependências npm em todos os serviços |
| `./helpdesk.sh build` | Constrói imagens Docker para produção |
| `./helpdesk.sh dev` | Inicia ambiente de desenvolvimento (hot-reload) |
| `./helpdesk.sh prod` | Inicia em modo produção |
| `./helpdesk.sh stop` | Para todos os containers |
| `./helpdesk.sh logs [serviço]` | Mostra logs (todos ou de um serviço específico) |
| `./helpdesk.sh status` | Mostra status dos containers |
| `./helpdesk.sh migrate` | Executa migrações do Prisma |
| `./helpdesk.sh shell <serviço>` | Acessa shell de um container |

### Portas em Desenvolvimento

| Serviço | Porta |
|---------|-------|
| Backend | 3000 (debug: 9229) |
| Frontend | 3001 |
| Bot | 3002 |
| GLPI | 8080 |
| RabbitMQ | 15672 |

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
├── docker-compose.yml         # Produção
├── docker-compose.dev.yml     # Desenvolvimento (hot-reload)
├── helpdesk.sh                # Script unificado de gerenciamento
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
