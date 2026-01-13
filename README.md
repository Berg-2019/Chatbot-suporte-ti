# 🎫 Helpdesk - Sistema de Atendimento Técnico via WhatsApp

Plataforma web completa de helpdesk para suporte técnico com integração WhatsApp.

![Node.js](https://img.shields.io/badge/Node.js-22+-green)
![Next.js](https://img.shields.io/badge/Next.js-15-blue)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Baileys-25D366)

## ✨ Funcionalidades

- 🤖 **Chatbot** - Primeiro atendimento automatizado
- 💬 **Chat unificado** - Bot e técnicos na mesma conversa
- 📊 **Dashboard** - Visão geral de tickets e filas
- 👥 **Multi-técnicos** - Cada um com login individual
- 🔄 **Handoff** - Transferência bot → humano automática
- 📱 **WhatsApp Web** - Conexão via QR ou código de pareamento
- 🔐 **Autenticação** - JWT com roles (admin/technician)

---

## 🚀 Início Rápido

### Desenvolvimento Local

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/helpdesk-whatsapp.git
cd helpdesk-whatsapp

# 2. Instalar dependências do backend
cd backend && npm install && cd ..

# 3. Instalar dependências do frontend
cd frontend && npm install && cd ..

# 4. Copiar configuração
cp .env.example .env

# 5. Iniciar backend (terminal 1)
cd backend && npm run dev

# 6. Iniciar frontend (terminal 2)
cd frontend && npm run dev
```

### Com Docker

```bash
# Copiar configuração
cp .env.example .env

# Iniciar tudo
docker compose up -d

# Ver logs
docker compose logs -f
```

---

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Portas
BACKEND_PORT=3003
FRONTEND_PORT=8080

# JWT (altere em produção!)
JWT_SECRET=sua-chave-super-secreta

# Admin padrão
ADMIN_EMAIL=admin@empresa.com
ADMIN_PASSWORD=admin123
```

---

## 📱 Conectando WhatsApp

1. Acesse `http://localhost:8080`
2. Faça login com `admin@empresa.com` / `admin123`
3. Vá em **Configurações** (ícone de engrenagem)
4. Escolha **QR Code** ou **Código de Pareamento**
5. Siga as instruções no painel

---

## 💬 Fluxo de Atendimento

```
1. 👤 Cliente envia "oi" no WhatsApp
2. 🤖 Bot coleta: setor, tipo, local, equipamento, problema
3. 🎫 Ticket é criado e entra na fila
4. 🔔 Técnico recebe notificação no painel
5. 👨‍💻 Técnico assume e responde pelo painel
6. 📱 Cliente recebe resposta no WhatsApp
7. ✅ Técnico finaliza o ticket
```

---

## 📁 Estrutura

```
helpdesk-whatsapp/
├── backend/                # API Node.js + Express
│   ├── src/
│   │   ├── app.ts         # Express com Socket.IO
│   │   ├── routes/        # auth, bot, tickets, chats
│   │   └── services/      # whatsapp, chatbot
│   └── package.json
├── frontend/               # Next.js + TailwindCSS
│   ├── app/
│   │   ├── login/         # Página de login
│   │   ├── dashboard/     # Dashboard principal
│   │   ├── chat/[id]/     # Interface de chat
│   │   └── settings/      # Configurações
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Endpoints

### Autenticação

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuário logado
- `POST /api/auth/register` - Criar usuário (admin)

### Bot WhatsApp

- `GET /api/bot/status` - Status da conexão
- `POST /api/bot/connect/qr` - Conectar via QR
- `POST /api/bot/connect/pairing` - Conectar via código
- `POST /api/bot/disconnect` - Desconectar

### Tickets

- `GET /api/tickets` - Listar tickets
- `GET /api/tickets/pending` - Tickets aguardando
- `POST /api/tickets/:id/assign` - Assumir ticket
- `POST /api/tickets/:id/close` - Fechar ticket

### Chat

- `GET /api/chats/:id/messages` - Mensagens do ticket
- `POST /api/chats/:id/messages` - Enviar mensagem

---

## 🛠️ Tecnologias

| Stack     | Tecnologia                     |
| --------- | ------------------------------ |
| Backend   | Node.js, Express, TypeScript   |
| Frontend  | Next.js 15, React, TailwindCSS |
| Real-time | Socket.IO                      |
| WhatsApp  | Baileys                        |
| Banco     | SQLite                         |
| Auth      | JWT                            |
| Deploy    | Docker                         |

---

## 📄 Licença

MIT
