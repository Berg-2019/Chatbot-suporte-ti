# 🧪 Guia de Teste - Fase 1 (Fundação)

## ✅ Pré-requisitos

### 1. Preparar Ambiente

```bash
# 1. Fazer checkout da branch
git checkout feature/chatbot-upgrade

# 2. Instalar dependências do backend
cd backend
npm install

# 3. Configurar banco de dados
npx prisma generate
npx prisma db push  # Cria as novas tabelas SEM afetar as existentes

# 4. Popular dados iniciais (seed)
npx tsx prisma/seed.ts

# 5. Instalar dependências do frontend
cd ../frontend
npm install
```

### 2. Verificar Banco de Dados

```bash
# Abrir Prisma Studio para visualizar as tabelas
cd backend
npx prisma studio
```

**Tabelas novas que devem aparecer:**
- ✅ `CannedResponse` - Respostas prontas
- ✅ `Webhook` - Webhooks
- ✅ `WebhookLog` - Logs de webhooks
- ✅ `CustomRole` - Roles customizadas
- ✅ `CsatResponse` - Pesquisas CSAT
- ✅ `AutomationRule` - Regras de automação
- ✅ `KnowledgeArticle` - Base de conhecimento
- ✅ `TicketLabel` - Labels de tickets

**⚠️ IMPORTANTE:** As tabelas existentes (`User`, `Ticket`, `Message`, `Contact`) **NÃO são modificadas**, apenas ganham novos campos opcionais.

---

## 🚀 Iniciar Aplicação

### Modo Desenvolvimento

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Acessar

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555

---

## 🧪 Testes por Feature

### Feature 1: Canned Responses (Respostas Prontas)

#### Backend - Testar Endpoints

```bash
# 1. Listar todas (deve retornar 10 respostas do seed)
curl http://localhost:3000/api/canned-responses

# 2. Buscar categorias
curl http://localhost:3000/api/canned-responses/categories

# 3. Autocomplete
curl http://localhost:3000/api/canned-responses/suggest?q=saudacao

# 4. Buscar por shortcode
curl http://localhost:3000/api/canned-responses/shortcode/saudacao

# 5. Criar nova (precisa de autenticação)
curl -X POST http://localhost:3000/api/canned-responses \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shortcode": "/teste",
    "title": "Teste",
    "content": "Olá {{contact_name}}, teste!",
    "category": "Testes",
    "isPublic": true
  }'
```

#### Frontend - Testar Interface

1. **Login** como `admin`
2. **Sidebar** → Clicar em "Respostas Prontas"
3. **Verificar:**
   - ✅ Lista com 10 respostas padrão
   - ✅ Filtro por categoria funciona
   - ✅ Filtro público/privado funciona
   - ✅ Busca textual funciona
4. **Criar nova:**
   - ✅ Clicar em "Nova Resposta"
   - ✅ Preencher formulário
   - ✅ Adicionar variáveis (ex: `{{contact_name}}`)
   - ✅ Salvar
5. **Editar:**
   - ✅ Clicar no ícone de editar
   - ✅ Modificar conteúdo
   - ✅ Salvar
6. **Deletar:**
   - ✅ Clicar no ícone de deletar
   - ✅ Confirmar exclusão

---

### Feature 2: Webhooks

#### Backend - Testar Endpoints

```bash
# 1. Listar webhooks
curl http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer SEU_TOKEN"

# 2. Criar webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "events": ["ticket_created", "ticket_resolved"],
    "active": true
  }'

# 3. Testar webhook
curl -X POST http://localhost:3000/api/webhooks/WEBHOOK_ID/test \
  -H "Authorization: Bearer SEU_TOKEN"

# 4. Ver logs
curl http://localhost:3000/api/webhooks/WEBHOOK_ID/logs \
  -H "Authorization: Bearer SEU_TOKEN"

# 5. Ver estatísticas
curl http://localhost:3000/api/webhooks/WEBHOOK_ID/stats \
  -H "Authorization: Bearer SEU_TOKEN"
```

#### Frontend - Testar Interface

1. **Login** como `admin`
2. **Sidebar** → Clicar em "Webhooks"
3. **Criar webhook:**
   - ✅ Clicar em "Novo Webhook"
   - ✅ Preencher nome e URL
   - ✅ Selecionar eventos
   - ✅ Adicionar secret (opcional)
   - ✅ Salvar
4. **Testar webhook:**
   - ✅ Clicar no ícone de Play
   - ✅ Verificar mensagem de sucesso/erro
5. **Ver logs:**
   - ✅ Clicar no ícone de Eye
   - ✅ Verificar modal com logs
   - ✅ Verificar estatísticas (total, sucesso, falhas, taxa)
6. **Editar e Deletar:**
   - ✅ Funcionalidades básicas CRUD

---

### Feature 3: Contacts (API pronta)

#### Backend - Testar Endpoints

```bash
# 1. Listar contatos (paginado)
curl http://localhost:3000/api/contacts?page=1&limit=20 \
  -H "Authorization: Bearer SEU_TOKEN"

# 2. Buscar setores
curl http://localhost:3000/api/contacts/sectors \
  -H "Authorization: Bearer SEU_TOKEN"

# 3. Buscar por ID
curl http://localhost:3000/api/contacts/CONTACT_ID \
  -H "Authorization: Bearer SEU_TOKEN"

# 4. Histórico de tickets
curl http://localhost:3000/api/contacts/CONTACT_ID/tickets \
  -H "Authorization: Bearer SEU_TOKEN"

# 5. Estatísticas
curl http://localhost:3000/api/contacts/CONTACT_ID/stats \
  -H "Authorization: Bearer SEU_TOKEN"

# 6. Buscar por telefone
curl http://localhost:3000/api/contacts/phone/5511999999999 \
  -H "Authorization: Bearer SEU_TOKEN"

# 7. Merge de contatos
curl -X POST http://localhost:3000/api/contacts/KEEP_ID/merge/MERGE_ID \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Nota:** Frontend ainda não tem sidebar específico, apenas API disponível.

---

### Feature 4: Roles & Permissões

#### Backend - Testar Endpoints

```bash
# 1. Listar roles (deve retornar 7 roles do seed)
curl http://localhost:3000/api/roles \
  -H "Authorization: Bearer SEU_TOKEN"

# 2. Listar permissões disponíveis
curl http://localhost:3000/api/roles/permissions \
  -H "Authorization: Bearer SEU_TOKEN"

# 3. Criar role customizada
curl -X POST http://localhost:3000/api/roles \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agente Júnior",
    "description": "Acesso básico para agentes iniciantes",
    "permissions": ["tickets:view", "tickets:create", "contacts:view"]
  }'

# 4. Atribuir role a usuário
curl -X POST http://localhost:3000/api/roles/ROLE_ID/assign/USER_ID \
  -H "Authorization: Bearer SEU_TOKEN"
```

#### Frontend - Testar Interface

1. **Login** como `admin`
2. **Sidebar** → Clicar em "Roles & Permissões"
3. **Verificar roles do sistema:**
   - ✅ Admin, N1, N2, N3, Estoquista, Visualizador, Supervisor
   - ✅ Ícone de cadeado nas roles do sistema
   - ✅ Não pode editar/deletar roles do sistema
4. **Criar role customizada:**
   - ✅ Clicar em "Nova Role"
   - ✅ Preencher nome e descrição
   - ✅ Selecionar permissões por módulo
   - ✅ Toggle de módulo completo funciona
   - ✅ "Selecionar todas" / "Limpar todas" funcionam
   - ✅ Salvar
5. **Editar role customizada:**
   - ✅ Modificar permissões
   - ✅ Salvar alterações
6. **Deletar role customizada:**
   - ✅ Apenas roles não-sistema podem ser deletadas

---

## 🔐 Testando Permissões

### 1. Criar Usuário de Teste

```bash
# Usar Prisma Studio ou SQL direto
# Criar usuário com role customizada
```

### 2. Testar Acesso Negado

```bash
# Tentar acessar endpoint sem permissão
curl http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer TOKEN_SEM_PERMISSAO"

# Deve retornar: 403 Forbidden
# Mensagem: "Acesso negado. É necessário ter pelo menos uma das permissões: webhooks:view"
```

### 3. Testar Wildcard

```bash
# Usuário com permissão "*" (admin)
# Deve ter acesso a TUDO

# Usuário com permissão "tickets:*"
# Deve ter acesso a todas ações de tickets
```

---

## 🐛 Troubleshooting

### Backend não inicia

```bash
# Verificar variáveis de ambiente
cat backend/.env

# Deve ter:
DATABASE_URL="postgresql://..."
JWT_SECRET="sua-chave-secreta"
```

### Erro de migração Prisma

```bash
# Se der erro de drift, use:
cd backend
npx prisma db push --force-reset  # ⚠️ CUIDADO: Apaga dados!

# Ou melhor, apenas push incremental:
npx prisma db push
```

### Frontend não carrega views

```bash
# Verificar imports no App.tsx
# Verificar rotas no Sidebar.tsx
# Verificar console do navegador (F12)
```

### Permissões não funcionam

```bash
# Verificar se RolesModule está importado
# Verificar se seed rodou (Prisma Studio)
# Verificar token JWT válido
```

---

## ✅ Checklist de Teste Completo

### Backend
- [ ] Todas as tabelas criadas no banco
- [ ] Seed executado com sucesso (10 canned responses, 7 roles)
- [ ] Endpoints de Canned Responses funcionando
- [ ] Endpoints de Webhooks funcionando
- [ ] Endpoints de Contacts funcionando
- [ ] Endpoints de Roles funcionando
- [ ] Permissões bloqueando acesso corretamente
- [ ] Guards retornando 403 quando apropriado

### Frontend
- [ ] CannedResponsesView carrega corretamente
- [ ] CRUD de Canned Responses funciona
- [ ] WebhooksView carrega corretamente
- [ ] Teste de webhook funciona
- [ ] Logs de webhook aparecem no modal
- [ ] RolesView carrega corretamente
- [ ] Criação de role customizada funciona
- [ ] Seleção de permissões funciona
- [ ] Sidebar mostra novos itens
- [ ] Itens aparecem apenas para roles corretas

### Integração
- [ ] Criar resposta pronta no backend, aparece no frontend
- [ ] Criar webhook, testar, ver logs no frontend
- [ ] Criar role, atribuir a usuário, testar permissões
- [ ] Interpolação de variáveis funciona nas respostas

---

## 📝 Notas Importantes

### Compatibilidade com Produção

✅ **SEGURO PARA TESTAR:**
- Apenas adiciona novas tabelas
- Não modifica dados existentes
- Sistema antigo continua funcionando
- Novas features só aparecem se acessar rotas específicas

⚠️ **CUIDADOS:**
- Fazer backup do banco antes de `db push` em produção
- Testar em ambiente DEV primeiro
- Verificar variáveis de ambiente
- Verificar permissões de usuários existentes

### Rollback

Se precisar voltar atrás:

```bash
# 1. Voltar para branch antiga
git checkout main

# 2. Dropar tabelas novas (se necessário)
# No Prisma Studio ou SQL:
DROP TABLE "CannedResponse";
DROP TABLE "Webhook";
DROP TABLE "WebhookLog";
DROP TABLE "CustomRole";
-- etc...
```

---

## 🎯 Próximos Passos

Após validar Fase 1:

1. **Integrar CannedResponsePicker no ChatView**
2. **Adicionar integração de Contacts no ChatView**
3. **Começar Fase 2 - Automação**
   - CSAT Survey
   - Automation Engine
   - Notas internas

---

**Criado em:** 2026-02-22
**Versão:** Fase 1 - Fundação
**Status:** Pronto para testes 🚀
