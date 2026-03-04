# 🔧 Plano de Melhoria - Sistema de Contatos

> **Problema Identificado:** Contatos não estão sendo criados/atualizados corretamente quando usuário abre chamado
> **Data:** 2026-03-04

---

## 📋 Análise do Sistema Atual

### Fluxo Atual (PROBLEMÁTICO)

```
1. Usuário envia mensagem WhatsApp
2. Bot coleta: nome, departamento/setor, JID
3. Dados ficam APENAS na sessão Redis
4. Ticket é criado via RabbitMQ → GLPI → Backend
5. ❌ Contato NÃO é criado/atualizado
6. Fechamento tenta usar contato que não existe
```

### Dados Disponíveis no Momento da Criação

No `handleConfirm()` do bot, temos na sessão:
- `session.data.contactName` - Nome completo
- `session.data.sector` - Setor/departamento (ex: "Financeiro", "TI")
- `session.data.userDepartment` - Departamento do solicitante
- `from` - JID completo do WhatsApp
- `phone` - Número de telefone extraído do JID

---

## ✅ Solução Proposta

### 1. Criar/Atualizar Contato ANTES de Criar Ticket

**Local:** `bot/src/handlers/flow-handler.js` - método `handleConfirm()`

**Implementação:**

```javascript
async handleConfirm(sock, from, text, session) {
  const phone = from.split('@')[0];

  if (['sim', 's', 'yes', 'confirmar', 'confirmo'].includes(text)) {
    // ✅ NOVO: Criar/atualizar contato ANTES de criar ticket
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

      const contactData = {
        jid: from,                                    // JID completo
        phoneNumber: phone,                           // Apenas números
        name: session.data.contactName,               // Nome coletado
        sector: session.data.userDepartment || session.data.sector || 'Não informado',
        department: session.data.userDepartment,      // Departamento específico
      };

      // Upsert: cria se não existe, atualiza se existe
      await axios.post(
        `${backendUrl}/api/contacts/upsert`,
        contactData,
        { timeout: 5000 }
      );

      console.log(`✅ Contato criado/atualizado: ${contactData.name} (${from})`);
    } catch (error) {
      console.error('⚠️  Falha ao criar contato:', error.message);
      // Não bloqueia criação do ticket
    }

    // Criar ticket normalmente...
    const ticketData = {
      phoneNumber: from,
      title: `...`,
      // ...
    };

    await rabbitmqService.publishCreateTicket(ticketData);
    // ...
  }
}
```

### 2. Melhorar Endpoint de Upsert no Backend

**Local:** `backend/src/presentation/controllers/contacts/contacts.controller.ts`

**Novo Endpoint:**

```typescript
@Post('upsert')
async upsertContact(@Body() dto: UpsertContactDto) {
  return this.contactsService.upsertByJid(dto.jid, {
    phoneNumber: dto.phoneNumber,
    name: dto.name,
    sector: dto.sector,
    department: dto.department,
    company: dto.company,
  });
}
```

**DTO:**

```typescript
// contacts.dto.ts
export class UpsertContactDto {
  @IsString()
  jid: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  name: string;

  @IsString()
  sector: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  ramal?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
```

### 3. Atualizar Contact Service

**Local:** `backend/src/presentation/controllers/contacts/contacts.service.ts`

**Método melhorado:**

```typescript
async upsertByJid(jid: string, dto: Omit<CreateContactDto, 'jid'>) {
  const now = new Date();

  return this.prisma.contact.upsert({
    where: { jid },
    create: {
      jid,
      ...dto,
      firstContactAt: now,
      lastContactAt: now,
      totalTickets: 0,
    },
    update: {
      ...dto,
      lastContactAt: now, // ✅ Sempre atualiza último contato
      totalTickets: { increment: 1 }, // ✅ Incrementa contador
    },
  });
}
```

### 4. Auto-Completar Dados no `ensureUserData()`

**Local:** `bot/src/handlers/flow-handler.js`

**Melhorar método existente:**

```javascript
async ensureUserData(sock, from, session, nextState) {
  const phone = from.split('@')[0];

  // 1. Verificar se já tem dados na sessão
  if (session.data.contactName && session.data.sector) {
    return true;
  }

  // 2. Verificar se contato existe no backend
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const contactRes = await axios.get(
      `${backendUrl}/api/contacts/by-jid/${encodeURIComponent(from)}`,
      { timeout: 3000 }
    );

    if (contactRes?.data) {
      const contact = contactRes.data;

      // ✅ Preencher TODOS os dados disponíveis
      session.data.contactName = contact.name;
      session.data.sector = contact.sector;
      session.data.userDepartment = contact.department || contact.sector;
      session.data.company = contact.company;
      session.data.ramal = contact.ramal;
      session.data.email = contact.email;

      await redisService.setSession(phone, session);

      console.log(`📋 Dados do contato carregados do backend: ${contact.name}`);
      return true;
    }
  } catch (e) {
    // Contato não encontrado, continua para coletar
  }

  // 3. Precisa coletar dados...
  session.data.afterUserData = nextState;
  session.state = STATES.ASK_NAME;
  await redisService.setSession(phone, session);
  await this.sendMessage(sock, from, 'Olá! Para continuar, preciso de algumas informações.\n\nQual é o seu *nome completo*?');
  return false;
}
```

---

## 🎨 Melhorias no Frontend (Modal de Fechamento)

### Problema Atual
- Modal de fechamento não mostra/edita dados do contato
- Informações importantes ficam ocultas

### Solução: Adicionar Seção de Contato

**Local:** `frontend/src/app/components/ChatView.tsx`

**Adicionar no modal:**

```tsx
<DialogContent>
  {/* Seção de Informações do Contato */}
  <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
    <Typography variant="subtitle2" gutterBottom>
      📋 Informações do Contato
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <Typography variant="body2" color="text.secondary">
          Nome: <strong>{ticket.customerName}</strong>
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography variant="body2" color="text.secondary">
          Setor: <strong>{ticket.sector}</strong>
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography variant="body2" color="text.secondary">
          Telefone: <strong>{ticket.phoneNumber}</strong>
        </Typography>
      </Grid>
      {contact?.email && (
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">
            Email: <strong>{contact.email}</strong>
          </Typography>
        </Grid>
      )}
    </Grid>
  </Box>

  {/* Resto do formulário de fechamento */}
  <TextField
    label="Solução Aplicada"
    multiline
    rows={4}
    // ...
  />
</DialogContent>
```

---

## 📊 Fluxo Melhorado

```
1. Usuário envia mensagem WhatsApp
2. Bot verifica se contato existe no backend
   ├─ Se SIM: Carrega dados na sessão
   └─ Se NÃO: Coleta nome + setor
3. Bot coleta problema, localização, etc
4. handleConfirm():
   ├─ ✅ UPSERT contato no backend
   ├─ Criar ticket via RabbitMQ
   └─ Ticket → GLPI → Backend local
5. Contato EXISTE e está atualizado
6. Fechamento funciona corretamente
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar `UpsertContactDto`
- [ ] Adicionar endpoint `POST /contacts/upsert`
- [ ] Melhorar `ContactsService.upsertByJid()`
- [ ] Adicionar auto-incremento de `totalTickets`
- [ ] Adicionar atualização de `lastContactAt`

### Bot
- [ ] Adicionar upsert de contato em `handleConfirm()`
- [ ] Melhorar `ensureUserData()` para carregar todos os campos
- [ ] Adicionar logs de sucesso/falha
- [ ] Testar fluxo completo

### Frontend
- [ ] Adicionar seção de contato no modal de fechamento
- [ ] Exibir: nome, setor, telefone, email
- [ ] Melhorar layout do modal
- [ ] Adicionar indicador visual se contato está cadastrado

---

## 🧪 Casos de Teste

### Teste 1: Novo Usuário
1. Usuário nunca usou o bot
2. Bot coleta nome + setor
3. Ticket é criado
4. ✅ Contato é criado no backend
5. ✅ Próximo chamado não precisa coletar dados novamente

### Teste 2: Usuário Recorrente
1. Usuário já tem contato cadastrado
2. Bot carrega dados do backend
3. Não pergunta nome/setor novamente
4. Ticket é criado
5. ✅ Contato atualiza `lastContactAt` e `totalTickets`

### Teste 3: Dados Incompletos
1. Contato existe mas falta departamento
2. Bot completa dados faltantes
3. Upsert atualiza campos novos
4. ✅ Contato fica completo

---

## 📈 Benefícios

1. ✅ **Histórico completo** - Todos os contatos ficam registrados
2. ✅ **Menos perguntas** - Usuários recorrentes não precisam re-informar dados
3. ✅ **Estatísticas precisas** - `totalTickets` e `lastContactAt` sempre atualizados
4. ✅ **Integração com Fase 4** - Email-to-Ticket poderá usar mesma base de contatos
5. ✅ **Melhor UX** - Frontend mostra informações completas do cliente

---

**Próximo:** Implementar melhorias no código
**Estimativa:** 2-3h de trabalho
