# Playbook - Helpdesk WhatsApp + GLPI

## Arquitetura

```
WhatsApp (Baileys)
    ↓
Webhook Receiver (stateless)
    ↓
Redis (estado da conversa)
    ↓
Bot Orchestrator (NestJS)
    ↓
RabbitMQ
    ↓
Workers (GLPI / Notify / WhatsApp)
```

## Contratos de API

### Autenticação

```
POST /api/auth/login
  Body: { email, password }
  Response: { token, user }

POST /api/auth/logout
  Headers: Authorization: Bearer <token>

GET /api/auth/me
  Headers: Authorization: Bearer <token>
  Response: { user }
```

### Tickets

```
GET /api/tickets
  Query: ?status=&assignedTo=&page=&limit=
  Response: { tickets[], total, page }

GET /api/tickets/:id
  Response: { ticket, messages[] }

POST /api/tickets
  Body: { title, description, priority, phoneNumber }
  Response: { ticket }

PUT /api/tickets/:id/assign
  Body: { userId }
  Response: { ticket }

PUT /api/tickets/:id/status
  Body: { status }
  Response: { ticket }

POST /api/tickets/:id/close
  Response: { ticket }
```

### Mensagens

```
GET /api/tickets/:id/messages
  Response: { messages[] }

POST /api/tickets/:id/messages
  Body: { content, type? }
  Response: { message }
```

### Bot WhatsApp

```
GET /api/bot/status
  Response: { connected, phoneNumber, uptime }

POST /api/bot/connect
  Body: { method: 'qr' | 'pairing', phone? }
  Response: { qrCode? | pairingCode? }

POST /api/bot/disconnect
```

### WebSocket Events

```
# Server → Client
ticket:created    { ticket }
ticket:updated    { ticket }
ticket:assigned   { ticket, assignedTo }
message:new       { ticketId, message }
bot:status        { status }
bot:qr            { qrCode }

# Client → Server
ticket:subscribe   { ticketId }
ticket:unsubscribe { ticketId }
```

## Endpoints GLPI Utilizados

```
GET  /apirest.php/initSession        # Iniciar sessão
GET  /apirest.php/killSession        # Encerrar sessão

POST /apirest.php/Ticket             # Criar ticket
GET  /apirest.php/Ticket/:id         # Obter ticket
PUT  /apirest.php/Ticket/:id         # Atualizar ticket

POST /apirest.php/Ticket/:id/ITILFollowup   # Adicionar followup
GET  /apirest.php/Ticket/:id/ITILFollowup   # Listar followups

GET  /apirest.php/search/Ticket      # Buscar tickets
```

## Regras de Negócio

### Criação de Ticket

- Todo ticket via WhatsApp tem prioridade "Normal" por padrão
- Bot coleta: setor, tipo do problema, descrição
- Ticket é criado no GLPI automaticamente com os dados coletados
- Técnico é notificado via Socket.IO

### Timeout e Resposta Automática

- 5 minutos sem resposta: "Seu chamado foi registrado, em breve um técnico irá atender"
- 30 minutos sem primeiro atendimento: Escala para supervisor

### Triagem Automática

- Palavras-chave mapeiam para categorias/filas:
  - "vpn", "internet", "rede" → Fila Infraestrutura
  - "sistema", "lotus", "movtrans" → Fila Sistemas
  - "impressora", "computador", "teclado" → Fila Hardware

### Atribuição de Atendente

- Round-robin entre técnicos da fila
- Prioriza técnico com menos tickets abertos

## Fluxos

### Abertura via WhatsApp

```
1. Cliente envia mensagem
2. Webhook Receiver recebe
3. Salva estado no Redis
4. Publica no RabbitMQ (queue: incoming_messages)
5. Orchestrator consome
6. Se novo: inicia fluxo de coleta
7. Se coleta completa: publica (queue: create_ticket)
8. Worker GLPI cria ticket
9. Worker Notify envia confirmação ao cliente
10. Socket.IO notifica painel web
```

### Resposta do Técnico

```
1. Técnico envia mensagem via painel
2. API salva no banco local
3. Publica no RabbitMQ (queue: outgoing_messages)
4. Worker WhatsApp envia via Baileys
5. Worker GLPI adiciona followup
```
