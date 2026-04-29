# Fase 1 - Fundação - Implementação

> Branch: `feature/chatbot-upgrade`
> Data de início: 2026-02-20
> Baseado em: [FEATURE_ABSORPTION_PLAN.md](./FEATURE_ABSORPTION_PLAN.md)

## Status da Implementação

### ✅ Database Schema (Prisma)

Todos os models necessários para a Fase 1 foram adicionados ao schema:

#### 1. RBAC com Roles Customizáveis (Peppermint)
- ✅ Model `CustomRole` criado
- ✅ User.roleId referenciando CustomRole
- ✅ Campo legacyRole mantido para compatibilidade
- ✅ Permissões granulares em JSON

#### 2. Sistema de Webhooks de Saída (Chatwoot/Peppermint)
- ✅ Model `Webhook` criado
- ✅ Model `WebhookLog` para auditoria
- ✅ Suporte a eventos múltiplos
- ✅ HMAC secret para segurança

#### 3. Model Contact Unificado + Histórico (Chatwoot)
- ✅ Contact atualizado com customAttributes
- ✅ Estatísticas: firstContactAt, lastContactAt, totalTickets
- ✅ Campos adicionais: email, company

#### 4. Respostas Prontas - Canned Responses (Chatwoot)
- ✅ Model `CannedResponse` criado
- ✅ Suporte a shortcodes
- ✅ Categorização
- ✅ Suporte a variáveis no conteúdo

### ✅ Features Adicionais (Fases 2-3)

Models criados antecipadamente:

- ✅ `CsatResponse` - Pesquisa de satisfação
- ✅ `AutomationRule` - Engine de automação
- ✅ `KnowledgeArticle` - Base de conhecimento/Wiki
- ✅ `TicketLabel` - Tags para tickets
- ✅ Message.isInternal e Message.mentions - Notas internas

## Próximos Passos

### 1. Executar Migration

```bash
cd backend
npx prisma migrate dev --name add_feature_absorption_phase1
npx prisma generate
```

### 2. Criar Services (Backend)

#### 2.1 RBAC Service
- [ ] `src/infrastructure/services/rbac.service.ts`
- [ ] Verificação de permissões granulares
- [ ] Guard atualizado para usar CustomRole
- [ ] Seed com roles padrão

#### 2.2 Webhook Service
- [ ] `src/infrastructure/services/webhook.service.ts`
- [ ] Trigger de webhooks em eventos
- [ ] HMAC signature
- [ ] Retry logic

#### 2.3 Contact Service
- [ ] `src/infrastructure/services/contact.service.ts`
- [ ] Auto-criação de contato em tickets
- [ ] Atualização de estatísticas
- [ ] Histórico completo

#### 2.4 Canned Response Service
- [ ] `src/infrastructure/services/canned-response.service.ts`
- [ ] CRUD de respostas
- [ ] Interpolação de variáveis
- [ ] Busca por shortcode

### 3. Criar Controllers (Backend)

- [ ] `src/presentation/controllers/roles/roles.controller.ts`
- [ ] `src/presentation/controllers/webhooks/webhooks.controller.ts`
- [ ] `src/presentation/controllers/contacts/contacts.controller.ts` (atualizar)
- [ ] `src/presentation/controllers/canned-responses/canned-responses.controller.ts`

### 4. Frontend (Next.js)

#### 4.1 Admin Panel - RBAC
- [ ] Página de gerenciamento de roles
- [ ] CRUD de permissões
- [ ] Atribuição de roles a usuários

#### 4.2 Admin Panel - Webhooks
- [ ] Configuração de webhooks
- [ ] Logs de execução
- [ ] Teste de webhook

#### 4.3 Chat View - Canned Responses
- [ ] Dropdown ao digitar `/`
- [ ] Autocomplete de shortcodes
- [ ] Interpolação de variáveis

#### 4.4 Chat View - Contact Sidebar
- [ ] Perfil do contato
- [ ] Histórico de tickets
- [ ] Custom attributes editáveis

### 5. Bot (WhatsApp)

- [ ] Integração com Contact service
- [ ] Auto-criação de contatos
- [ ] Atualização de lastContactAt

## Permissões Definidas

### tickets:*
- `tickets:read` - Visualizar tickets
- `tickets:write` - Criar/editar tickets
- `tickets:assign` - Atribuir tickets
- `tickets:delete` - Deletar tickets
- `tickets:close` - Fechar tickets

### stock:*
- `stock:read` - Visualizar estoque
- `stock:write` - Adicionar/editar itens
- `stock:delete` - Deletar itens
- `stock:movement` - Registrar movimentações

### reservations:*
- `reservations:read` - Visualizar reservas
- `reservations:write` - Criar reservas
- `reservations:approve` - Aprovar reservas

### users:*
- `users:read` - Visualizar usuários
- `users:write` - Criar/editar usuários
- `users:delete` - Deletar usuários

### reports:*
- `reports:read` - Visualizar relatórios
- `reports:export` - Exportar relatórios

### admin:*
- `admin:settings` - Configurações do sistema
- `admin:automation` - Regras de automação
- `admin:webhooks` - Gerenciar webhooks
- `admin:roles` - Gerenciar roles

### bot:*
- `bot:config` - Configurar bot
- `bot:messages` - Ver mensagens do bot

## Roles Padrão (Seed)

### 1. Administrador
```json
{
  "name": "Administrador",
  "description": "Acesso total ao sistema",
  "permissions": ["*"],
  "isSystem": true
}
```

### 2. Técnico N1
```json
{
  "name": "Técnico N1",
  "description": "Atendimento básico",
  "permissions": [
    "tickets:read",
    "tickets:write",
    "stock:read",
    "reports:read"
  ],
  "isSystem": true
}
```

### 3. Técnico N2
```json
{
  "name": "Técnico N2",
  "description": "Suporte intermediário",
  "permissions": [
    "tickets:read",
    "tickets:write",
    "tickets:assign",
    "stock:read",
    "stock:write",
    "reports:read",
    "reports:export"
  ],
  "isSystem": true
}
```

### 4. Técnico N3
```json
{
  "name": "Técnico N3",
  "description": "Especialista",
  "permissions": [
    "tickets:*",
    "stock:*",
    "reports:*",
    "users:read"
  ],
  "isSystem": true
}
```

### 5. Estoquista
```json
{
  "name": "Estoquista",
  "description": "Gerenciamento de estoque",
  "permissions": [
    "stock:*",
    "reservations:*",
    "tickets:read",
    "reports:read"
  ],
  "isSystem": true
}
```

### 6. Visualizador
```json
{
  "name": "Visualizador",
  "description": "Apenas visualização",
  "permissions": [
    "tickets:read",
    "stock:read",
    "reports:read"
  ],
  "isSystem": true
}
```

## Eventos de Webhook

### Tickets
- `ticket_created` - Novo ticket criado
- `ticket_updated` - Ticket atualizado
- `ticket_assigned` - Ticket atribuído
- `ticket_resolved` - Ticket resolvido
- `ticket_closed` - Ticket fechado

### Messages
- `message_received` - Nova mensagem recebida
- `message_sent` - Mensagem enviada

### CSAT
- `csat_received` - Avaliação recebida

### Automation
- `automation_executed` - Regra executada

## Variáveis para Canned Responses

- `{{contact_name}}` - Nome do contato
- `{{contact_phone}}` - Telefone do contato
- `{{contact_sector}}` - Setor do contato
- `{{ticket_id}}` - ID do ticket
- `{{ticket_priority}}` - Prioridade do ticket
- `{{agent_name}}` - Nome do agente
- `{{current_time}}` - Hora atual
- `{{current_date}}` - Data atual

## Testes

### Unit Tests
- [ ] RBAC Service - verificação de permissões
- [ ] Webhook Service - trigger e HMAC
- [ ] Contact Service - criação e atualização
- [ ] Canned Response Service - interpolação

### Integration Tests
- [ ] API de roles (CRUD)
- [ ] API de webhooks (CRUD + logs)
- [ ] API de canned responses (CRUD + search)

### E2E Tests
- [ ] Fluxo completo: criar ticket → webhook disparado
- [ ] Fluxo: técnico usa canned response → variáveis interpoladas
- [ ] Fluxo: verificar permissão RBAC → acesso negado/permitido

## Observações

- Mantida compatibilidade com sistema legado através do campo `User.legacyRole`
- Migration será incremental para não quebrar dados existentes
- Documentação de API será atualizada após implementação dos controllers
- Frontend será desenvolvido após estabilização do backend
