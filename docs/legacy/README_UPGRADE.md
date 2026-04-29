# 🚀 Chatbot Suporte TI - Feature Absorption Upgrade

> **Branch**: `feature/chatbot-upgrade`
> **Data de Início**: 2026-02-20
> **Status**: Fase 1 - Fundação ✅ CONCLUÍDA (Database Schema)

---

## 📋 Visão Geral

Este upgrade implementa as melhores funcionalidades de **Chatwoot**, **Peppermint**, **Typebot** e **Rasa** no sistema de Helpdesk existente, seguindo a estratégia de "cherry-pick" de features ao invés de integração de sistemas externos.

### Documentação Principal
- [📁 FEATURE_ABSORPTION_PLAN.md](./FEATURE_ABSORPTION_PLAN.md) - Plano completo de absorção (5 fases)
- [📁 FASE1_IMPLEMENTATION.md](./FASE1_IMPLEMENTATION.md) - Detalhes da implementação da Fase 1

---

## ✅ Progresso Atual

### Fase 1 - Fundação (2 semanas) - 🟢 DATABASE SCHEMA COMPLETO

| Feature | Origem | Status | Descrição |
|---------|--------|--------|-----------|
| **RBAC Customizável** | Peppermint | ✅ Schema | Roles com permissões granulares |
| **Webhooks de Saída** | Chatwoot/Peppermint | ✅ Schema | Disparar eventos para sistemas externos |
| **Contact Unificado** | Chatwoot | ✅ Schema | Histórico completo e atributos customizados |
| **Canned Responses** | Chatwoot | ✅ Schema | Respostas prontas com variáveis |
| **CSAT** | Chatwoot | ✅ Schema | Pesquisa de satisfação |
| **Automation Engine** | Chatwoot | ✅ Schema | Regras evento→condição→ação |
| **Knowledge Base** | Peppermint | ✅ Schema | Wiki interna com Markdown |
| **Ticket Labels** | Chatwoot | ✅ Schema | Tags para organização |
| **Notas Internas** | Chatwoot | ✅ Schema | Mensagens privadas entre técnicos |

---

## 🗄️ Mudanças no Banco de Dados

### Novos Models Criados

```prisma
// RBAC
model CustomRole {
  id          String
  name        String @unique
  description String?
  permissions Json    // ["tickets:read", "tickets:write", ...]
  isSystem    Boolean
  users       User[]
}

// Webhooks
model Webhook {
  id        String
  url       String
  events    String[]  // ['ticket_created', 'ticket_resolved', ...]
  active    Boolean
  secret    String?
  headers   Json?
  logs      WebhookLog[]
}

// Respostas Prontas
model CannedResponse {
  id        String
  shortcode String @unique  // "/saudacao"
  content   String          // Com suporte a {{variáveis}}
  category  String?
  createdBy String
}

// CSAT
model CsatResponse {
  id           String
  ticketId     String @unique
  rating       Int     // 1-5
  feedback     String?
  assignedToId String?
  respondedAt  DateTime
  channel      String
}

// Automação
model AutomationRule {
  id          String
  name        String
  event       String
  conditions  Json
  actions     Json
  active      Boolean
}

// Knowledge Base
model KnowledgeArticle {
  id        String
  title     String
  content   String  // Markdown
  category  String
  tags      String[]
  isPublic  Boolean
  authorId  String
}

// Labels
model TicketLabel {
  id       String
  ticketId String
  label    String
  color    String?
}
```

### Models Atualizados

#### User
```prisma
+ roleId    String?         // Ref para CustomRole
+ customRole CustomRole?
  role      Role  @default(AGENT)  // Mantido para compatibilidade
```

#### Contact
```prisma
+ email              String?
+ company            String?
+ customAttributes   Json?    @default("{}")
+ firstContactAt     DateTime @default(now())
+ lastContactAt      DateTime @default(now())
+ totalTickets       Int      @default(0)
```

#### Message
```prisma
+ isInternal  Boolean  @default(false)
+ mentions    String[] @default([])
```

#### Ticket
```prisma
+ csatResponse  CsatResponse?
+ labels        TicketLabel[]
```

---

## 🌱 Seed Data

Executado automaticamente com `npm run prisma:seed`:

### 1. Roles do Sistema (7)
- ✅ **Administrador** - Acesso total (*)
- ✅ **Técnico N1** - Atendimento básico
- ✅ **Técnico N2** - Suporte intermediário
- ✅ **Técnico N3** - Especialista
- ✅ **Estoquista** - Gestão de estoque
- ✅ **Visualizador** - Apenas leitura
- ✅ **Supervisor** - Gestão de equipe

### 2. Canned Responses (10)
- `/saudacao` - Cumprimento inicial
- `/aguarde` - Pedir paciência
- `/resolvido` - Ticket solucionado
- `/reiniciar_pc` - Instrução de reinício
- `/senha_wifi` - Info da rede
- `/reset_senha` - Redefinir senha
- `/impressora_offline` - Troubleshooting
- `/energia` - Problema elétrico
- `/ar_condicionado` - Climatização
- `/fora_horario` - Mensagem automática

### 3. Knowledge Base (3 artigos)
- **Como redefinir senha do sistema** (Público)
- **Procedimento de Escalonamento de Tickets** (Interno)
- **Troubleshooting - Impressora Não Imprime** (Interno)

---

## 🔐 Permissões Definidas

### Módulos de Permissão

#### tickets:*
- `tickets:read` - Visualizar
- `tickets:write` - Criar/Editar
- `tickets:assign` - Atribuir
- `tickets:delete` - Deletar
- `tickets:close` - Fechar

#### stock:*
- `stock:read`, `stock:write`, `stock:delete`, `stock:movement`

#### reservations:*
- `reservations:read`, `reservations:write`, `reservations:approve`

#### users:*
- `users:read`, `users:write`, `users:delete`

#### reports:*
- `reports:read`, `reports:export`

#### admin:*
- `admin:settings`, `admin:automation`, `admin:webhooks`, `admin:roles`

#### bot:*
- `bot:config`, `bot:messages`

---

## 🎯 Próximos Passos

### Backend (NestJS)

#### 1. Services
- [ ] `src/infrastructure/services/rbac.service.ts`
- [ ] `src/infrastructure/services/webhook.service.ts`
- [ ] `src/infrastructure/services/contact.service.ts`
- [ ] `src/infrastructure/services/canned-response.service.ts`
- [ ] `src/infrastructure/services/csat.service.ts`
- [ ] `src/infrastructure/services/automation-engine.service.ts`
- [ ] `src/infrastructure/services/knowledge-base.service.ts`

#### 2. Controllers
- [ ] `src/presentation/controllers/roles/roles.controller.ts`
- [ ] `src/presentation/controllers/webhooks/webhooks.controller.ts`
- [ ] `src/presentation/controllers/canned-responses/canned-responses.controller.ts`
- [ ] `src/presentation/controllers/csat/csat.controller.ts`
- [ ] `src/presentation/controllers/automation/automation.controller.ts`
- [ ] `src/presentation/controllers/knowledge/knowledge.controller.ts`

#### 3. Guards
- [ ] Atualizar `PermissionsGuard` para verificar permissões granulares
- [ ] Decorator `@RequirePermissions(['tickets:write'])`

### Frontend (Next.js)

#### 1. Admin Panel
- [ ] Página de gerenciamento de Roles
- [ ] Configuração de Webhooks + Logs
- [ ] CRUD de Canned Responses
- [ ] CRUD de Automation Rules
- [ ] Editor de Knowledge Base

#### 2. Chat Interface
- [ ] Dropdown de Canned Responses (ao digitar `/`)
- [ ] Toggle "Nota Interna"
- [ ] Autocomplete de @mentions
- [ ] Sidebar de Contact com histórico
- [ ] Envio de CSAT após resolução

### Bot (WhatsApp)

- [ ] Integração com ContactService (auto-criação)
- [ ] Fluxo de CSAT após fechar ticket
- [ ] Variáveis dinâmicas nas mensagens

---

## 🧪 Como Testar

### 1. Verificar Schema
```bash
cd backend
npm run prisma:studio
```

### 2. Executar Seed
```bash
cd backend
npm run prisma:seed
```

### 3. Verificar Roles Criadas
No Prisma Studio, verificar tabela `custom_roles`

### 4. Verificar Canned Responses
Tabela `canned_responses` deve ter 10 registros

---

## 📊 Roadmap Completo

### ✅ Fase 1 - Fundação (2 semanas) - **CONCLUÍDO: DATABASE SCHEMA**
- ✅ RBAC customizável
- ✅ Webhooks de saída
- ✅ Contact unificado
- ✅ Canned Responses
- ⏳ **Próximo**: Implementar Services e Controllers

### ⏳ Fase 2 - Automação (2 semanas)
- Engine de Automação
- Auto-atribuição de agentes
- CSAT funcional
- Notas internas + @mentions

### ⏳ Fase 3 - Intelligence (2 semanas)
- Intent Detection (LLM)
- Métricas por agente
- Labels/Tags funcionais
- Variáveis dinâmicas no bot

### ⏳ Fase 4 - Canais & Knowledge (2 semanas)
- Email-to-ticket (IMAP)
- Knowledge Base completa
- Busca FAQ com sugestões
- Server Logs no admin

### ⏳ Fase 5 - Polish (1 semana)
- Bloqueio de contatos spam
- Som de notificação
- Macros (ações em lote)
- Live View (conversas ativas)

---

## ⚠️ Observações Importantes

### Compatibilidade com Produção

- ✅ **Campo `User.role` mantido** - Sistema legado continua funcionando
- ✅ **Contact.jid mantido** - Compatibilidade com sistema atual
- ✅ **Sem breaking changes** - Apenas adições incrementais
- ✅ **Migration segura** - Usando `db push` ao invés de `migrate`

### Testes Antes de Deploy

1. Testar todas as features existentes
2. Verificar se usuários existentes continuam logando
3. Verificar se bot continua criando tickets
4. Validar integração GLPI
5. Testar Socket.IO e WebSocket

---

## 🔗 Links Úteis

- [Prisma Studio](http://localhost:5555) - `npm run prisma:studio`
- [Backend API](http://localhost:3000)
- [Frontend](http://localhost:3001)
- [RabbitMQ](http://localhost:15672)

---

## 📝 Commits

### Último Commit
```
feat: Fase 1 - Fundação - Feature Absorption

- Database schema completo para 9 novas features
- Seed com roles, canned responses e knowledge base
- Documentação completa do upgrade
```

### Histórico
```bash
git log --oneline --graph feature/chatbot-upgrade
```

---

## 🤝 Contribuindo

Para continuar a implementação:

1. Verificar [FASE1_IMPLEMENTATION.md](./FASE1_IMPLEMENTATION.md) para próximos passos
2. Criar services na ordem: RBAC → Webhook → Contact → Canned Response
3. Testar cada service antes de avançar
4. Atualizar este README com progresso

---

**Desenvolvido com 🤖 Claude Code**
