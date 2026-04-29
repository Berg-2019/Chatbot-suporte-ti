# Hermes Helpdesk Tools Server

Servidor que expõe tools para o Hermes Agent usar.

## Setup

```bash
cd backend-tools
npm install
```

## Configuração

Crie um `.env` na pasta `backend-tools/`:

```bash
# Backend do Helpdesk (NestJS)
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=sua_chave_api

# Porta do server (opcional)
PORT=3001
```

## Rodar

```bash
npm start
# ou
npm run dev  # com hot-reload
```

## Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| GET | `/api/tools` | Lista todas tools disponíveis |
| POST | `/api/tools/execute` | Executa uma tool |

## Executar Tool

```bash
curl -X POST http://localhost:3001/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "create_helpdesk_ticket",
    "parameters": {
      "title": "Notebook travando",
      "description": "O notebook está muito lento e travando",
      "area": "TI",
      "phone": "5511999999999"
    }
  }'
```

## Tools Disponíveis

| Tool | Descrição |
|------|-----------|
| `create_helpdesk_ticket` | Cria ticket |
| `check_helpdesk_ticket` | Consulta ticket |
| `check_active_ticket` | Verifica ticket ativo |
| `search_helpdesk_faq` | Busca FAQ |
| `mark_faq_helpful` | Marca FAQ útil |
| `check_equipment_availability` | Verifica disponibilidade |
| `create_equipment_reservation` | Cria reserva |
| `notify_agent_escalation` | Notifica agente |
| `get_agent_status` | Status agentes |
