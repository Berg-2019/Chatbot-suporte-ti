# Hermes Agent Integration MVP Plan

## Objetivo

Substituir as APIs de IA (MiniMax, Claude, OpenAI) pelo **Hermes Agent** como brain conversacional do helpdesk, mantendo:
- Fluxo natural de conversa via WhatsApp
- Coleta inteligente de informações
- Geração de tickets para atendimento humano
- Respostas prontas (como Captain faz)
- Escalação inteligente para agentes

---

## Fase 1: Setup e Configuração

### 1.1 Instalar Hermes localmente

```bash
cd /home/dev/Projetos/hermes-agent
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc
hermes doctor  # Verificar instalação
```

### 1.2 Configurar provider de IA

```bash
hermes model
# Selecionar provider preferido (OpenRouter recomendado para flexibilidade)
# Configurar API key no ~/.hermes/.env
```

### 1.3 Configurar WhatsApp Gateway

```bash
hermes gateway setup
# Selecionar WhatsApp
# Escaneear QR code
# Configurar WHATSAPP_ALLOWED_USERS=* (ou números específicos)
```

### 1.4 Configurar acesso ao backend

No `~/.hermes/.env`:

```bash
# Backend API (seu NestJS)
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=sua_chave_api

# GLPI API
GLPI_URL=https://glpi.helpdeskmsm.com.br/apirest.php
GLPI_APP_TOKEN=seu_app_token
GLPI_USER_TOKEN=seu_user_token
```

---

## Fase 2: Skills de Helpdesk

Criar skills em `~/.hermes/skills/` que o Hermes usa para interagir com seu sistema.

### 2.1 Skill: Criar Ticket

**Arquivo:** `~/.hermes/skills/helpdesk-create-ticket/SKILL.md`

```markdown
# Helpdesk Create Ticket

Cria um novo ticket de suporte no sistema.

## Trigger
- "abrir chamado", "criar ticket", "preciso de ajuda", "problema"
- Intent de escalação detectada

## Input收集
Antes de criar o ticket, colete:
- **Descrição do problema**: O que está acontecendo?
- **Área**: TI ou Elétrica
- **Setor**: Qual departamento?
- **Localização**: Onde está o problema?
- **Nome**: Nome do solicitante

## Tool Call
Use `http_request` para chamar:
```
POST {BACKEND_URL}/api/bot/tickets
{
  "title": "Descrição resumida",
  "description": "Descrição completa",
  "area": "TI" | "ELECTRIC",
  "sector": "setor",
  "location": "localização",
  "requesterName": "nome",
  "phone": "telefone_do_usuario"
}
```

## Response
Após criar, informe:
- **Número do ticket** (ex: #1234)
- **Previsão de atendimento**
- Como consultar status posteriormente
```

### 2.2 Skill: Consultar Status Ticket

**Arquivo:** `~/.hermes/skills/helpdesk-check-status/SKILL.md`

```markdown
# Helpdesk Check Status

Consulta o status de um ticket existente.

## Trigger
- "status do chamado", "andamento", "ticket #1234"
- Usuário fornece número de ticket

## Tool Call
```
GET {BACKEND_URL}/api/bot/tickets/{ticket_id}
```

## Response
Retorne:
- Status atual (ABERTO, EM_ATENDIMENTO, RESOLVIDO, FECHADO)
- Técnico atribuído (se houver)
- Última atualização
- Histórico resumido
```

### 2.3 Skill: FAQ / Base de Conhecimento

**Arquivo:** `~/.hermes/skills/helpdesk-faq/SKILL.md`

```markdown
# Helpdesk FAQ

Busca respostas na base de conhecimento do helpdesk.

## Trigger
- "como fazer", "pergunta frequente", "faq"
- Perguntas sobre problemas comuns

## Tool Call
```
GET {BACKEND_URL}/api/faq/search?q={pergunta}
```

## Response
Retorne a resposta encontrada com:
- Título do artigo
- Conteúdo formatado
- Avaliação (foi útil?)
```

### 2.4 Skill: Reservar Equipamento

**Arquivo:** `~/.hermes/skills/helpdesk-reserve-equipment/SKILL.md`

```markdown
# Helpdesk Reserve Equipment

Faz reserva de equipamentos de TI.

## Trigger
- "reservar", "empréstimo de equipamento"
- Intent de reserva detectada

## Input收集
- **Tipo de equipamento**: Notebook, Monitor, Teclado, Mouse, etc.
- **Data início**: Quando precisa
- **Data fim**: Quando devolve
- **Motivo**: Para que precisa

## Tool Call
```
POST {BACKEND_URL}/api/reservations
{
  "stockType": "NOTEBOOK",
  "startDate": "2026-04-23",
  "endDate": "2026-04-30",
  "reason": "Reunião externa",
  "phone": "telefone"
}
```
```

### 2.5 Skill: Escalação para Agente

**Arquivo:** `~/.hermes/skills/helpdesk-escalate/SKILL.md`

```markdown
# Helpdesk Escalate

Escala uma conversa para um agente humano.

## Trigger
- "falar com atendente", "preciso de técnico"
- Baixa confiança em resposta automática
- Problema complexo detectado

## Tool Call
```
POST {BACKEND_URL}/api/bot/escalate
{
  "phone": "telefone",
  "conversationHistory": [...],
  "context": {
    "ticketId": "id_se_houver",
    "issue": "descrição_do_problema",
    "attempts": ["tentativa1", "tentativa2"]
  }
}
```

## Response
- Informe que está transferindo para um atendente
- Tempo estimado de resposta
- Opção de deixar mensagem caso urgente
```

---

## Fase 3: Tools do Backend

Adicionar endpoints no seu NestJS que o Hermes vai chamar.

### 3.1 Endpoints necessários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/bot/tickets` | Criar ticket |
| GET | `/api/bot/tickets/:id` | Consultar ticket |
| GET | `/api/bot/tickets/by-phone/:phone` | Tickets por telefone |
| POST | `/api/bot/escalate` | Escalação para agente |
| GET | `/api/faq/search` | Buscar FAQ |
| POST | `/api/reservations` | Criar reserva |

### 3.2 Exemplo de controller (Node.js/Express para teste)

```javascript
// hermes-integration/backend-tools.js
// Tool simples para testar integração com Hermes

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Config
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Tool: Criar ticket
const createTicketTool = {
  name: 'create_helpdesk_ticket',
  description: 'Cria um novo ticket de suporte no helpdesk',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Título do problema' },
      description: { type: 'string', description: 'Descrição detalhada' },
      area: { type: 'string', enum: ['TI', 'ELECTRIC'] },
      sector: { type: 'string', description: 'Departamento' },
      location: { type: 'string', description: 'Localização' },
      requesterName: { type: 'string', description: 'Nome do solicitante' },
      phone: { type: 'string', description: 'Telefone do solicitante' },
    },
    required: ['title', 'description', 'phone'],
  },
};

// Tool: Consultar ticket
const checkTicketTool = {
  name: 'check_helpdesk_ticket',
  description: 'Consulta o status de um ticket existente',
  parameters: {
    type: 'object',
    properties: {
      ticket_id: { type: 'string', description: 'Número ou ID do ticket' },
    },
    required: ['ticket_id'],
  },
};

// Tool: Buscar FAQ
const searchFaqTool = {
  name: 'search_helpdesk_faq',
  description: 'Busca respostas na base de conhecimento',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Pergunta ou keywords' },
    },
    required: ['query'],
  },
};

// Implementação das tools
async function createTicket(params) {
  const res = await axios.post(`${BACKEND_URL}/api/bot/tickets`, params);
  return res.data;
}

async function checkTicket({ ticket_id }) {
  const res = await axios.get(`${BACKEND_URL}/api/bot/tickets/${ticket_id}`);
  return res.data;
}

async function searchFaq({ query }) {
  const res = await axios.get(`${BACKEND_URL}/api/faq/search`, { params: { q: query } });
  return res.data;
}

module.exports = { createTicketTool, checkTicketTool, searchFaqTool, createTicket, checkTicket, searchFaq };
```

---

## Fase 4: Integração via MCP (Opcional)

Se quiser uma integração mais profunda, usar MCP (Model Context Protocol).

### 4.1 MCP Server para Helpdesk

```bash
# Instalar dependência
npm install -g @modelcontextprotocol/server-http

# Criar server de exemplo
cat > ~/.hermes/mcp-servers/helpdesk-mcp.json << 'EOF'
{
  "mcp_servers": {
    "helpdesk": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    }
  }
}
EOF
```

### 4.2 Configurar no Hermes

No `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  helpdesk:
    command: node
    args: ["/path/to/hermes-integration/helpdesk-mcp-server.js"]
    env:
      BACKEND_URL: "http://localhost:3000"
      BACKEND_API_KEY: "sua_chave"
```

---

## Fase 5: Migration do Captain Assistant

Seu `CaptainAssistantService` faz RAG + auto-resolve. Migrar para Hermes:

### 5.1 Knowledge Base do Hermes

```bash
# Adicionar documentos ao vector store do Hermes
hermes memory add --file ./knowledge-base/procedures.md
hermes memory add --file ./knowledge-base/faq.md
hermes memory add --file ./knowledge-base/troubleshooting.md
```

### 5.2 Configurar RAG no Hermes

No `~/.hermes/config.yaml`:

```yaml
memory:
  provider: sqlite  # ou postgres para produção
  embedding_model: all-MiniLM-L6-v2

rag:
  enabled: true
  top_k: 5
  min_similarity: 0.7
```

### 5.3 Configurar auto-resolution

```bash
# Configurar threshold de confiança
hermes config set captain.auto_resolve_threshold 0.75
hermes config set captain.max_retries 3
```

---

## Fase 6: Fluxo de Conversa Implementado

### Fluxo ideal:

```
User: "Bom dia, meu note está travando"
       ↓
Hermes (WhatsApp Gateway)
       ↓
Detecta intent: problema_tecnico
       ↓
Coleta contexto via conversa natural:
  "Qual é o modelo do notebook?"
  "Desde quando está acontecendo?"
  "Alguma mensagem de erro?"
       ↓
Busca no FAQ/KB → Encontra procedimento
       ↓
Se resolve → Responde com solução
Se não resolve → Escalona para agente com contexto
       ↓
Cria ticket no GLPI com:
  - Descrição coletada
  - Histórico da conversa
  - Setor/Área identificada
       ↓
Notifica agente no painel
```

---

## Cronograma MVP

| Fase | Descrição | Estimativa |
|------|-----------|------------|
| 1 | Setup Hermes + WhatsApp | 1-2h |
| 2 | Criar 3-5 skills básicas | 2-3h |
| 3 | Backend endpoints | 1-2h |
| 4 | Testar fluxo conversa | 2-3h |
| 5 | Migrar KB + RAG | 2-3h |
| 6 | Testes + ajustes | 2-3h |

**Total estimado: 10-16h**

---

## Como Começar

1. **Fork feito** → `/home/dev/Projetos/hermes-agent`
2. **Instalar localmente** → `curl -fsSL ... | bash`
3. **Criar skills** → based nos templates acima
4. **Testar** → `hermes` no CLI, depois `hermes gateway`

---

## Pasta de Trabalho

```
hermes-integration/
├── skills/
│   ├── helpdesk-create-ticket/
│   ├── helpdesk-check-status/
│   ├── helpdesk-faq/
│   ├── helpdesk-reserve-equipment/
│   └── helpdesk-escalate/
├── backend-tools/
│   ├── server.js
│   └── package.json
├── knowledge-base/
│   ├── procedures.md
│   ├── faq.md
│   └── troubleshooting.md
└── config/
    └── hermes-config.yaml
```

---

## Recursos

- [Hermes Docs](https://hermes-agent.nousresearch.com/docs/)
- [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [WhatsApp Setup](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp)
- [Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
