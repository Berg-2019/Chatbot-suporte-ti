# Handoff — Bug do Chat de Ticket (para MiniMax / próximo agente)

> **Sintoma do usuário (2026-05-04):** "Não consigo abrir chat mesmo em um ticket mock."
> Após remoção dos fallbacks demo, ao clicar em **Conversar** num ticket (rota `/chat/$ticketId`) a tela carrega mas:
> - Mensagens vazias ou renderizando no lado errado da bolha
> - Header mostra "Chat" em vez do nome do solicitante
> - Botões "Encerrar Chamado" / "Transferir" / "Sugestões" falham silenciosamente
>
> Causa raiz: **vários contratos backend ↔ frontend não batem**. Não é "bug do chat" — são 5 contratos quebrados convergindo no mesmo fluxo.
> Última atualização: 2026-05-04

---

## ✅ Validação executada (2026-05-04, smoke test contra backend ao vivo)

Todos os bugs abaixo foram **reproduzidos via curl** com `admin@helpdesk.com` autenticado. Evidências:

| Bug | Comando | Resultado observado |
|---|---|---|
| 1 | `GET /api/chat/messages/<id>` | `sender` é `{id, name, role}` (objeto), `direction: OUTGOING`, **`senderName: null`**. Frontend espera string flat. |
| 2 | `GET /api/ai/suggestions/<id>` | **HTTP 404**. Endpoint sem `:ticketId` (`GET /api/ai/suggestions`) retorna `{totalIssues, suggestions, recommendedActions}` — outro feature. |
| 3a | `PATCH /api/tickets/<id>/status {status:"CLOSED"}` | **HTTP 404 Not Found**. |
| 3b | `PATCH /api/tickets/<id>/status {status:"closed"}` | **HTTP 404 Not Found** — verbo errado, casing irrelevante. |
| 3c | `PUT /api/tickets/<id>/status {status:"CLOSED"}` | **HTTP 200 ✓** — verbo correto é **PUT**, não PATCH. Backend usa `@Put(':id/status')` em [tickets.controller.ts:107](../backend/src/presentation/controllers/tickets/tickets.controller.ts#L107). |
| 3d | `POST /api/tickets/<id>/close` | **HTTP 201 ✓** — endpoint alternativo dedicado existe ([linha 115](../backend/src/presentation/controllers/tickets/tickets.controller.ts#L115)). |
| 4 | `POST /api/tickets/<id>/transfer {userId:"N2"}` | **HTTP 500** — FK violation, "N2" não é UUID válido de User. |

**Conclusão:** todos os 5 bugs são reais e reprodutíveis. O Bug 3 ganhou nuance: o verbo HTTP do frontend (`PATCH`) está errado — o backend expõe `PUT /:id/status` e `POST /:id/close`. Casing do enum (`CLOSED` vs `closed`) é secundário, mas necessário pro `PUT` funcionar.

---

## 🎯 Escopo de quem vai resolver

Você precisa tocar **4 arquivos de contrato** + **1 arquivo do frontend** para destravar o fluxo. Tudo é determinístico — não há ambiguidade de design, só ajuste de schema/normalização. Estimativa: **45 min** com testes.

Arquivos:
1. `backend/src/presentation/controllers/chat/chat.service.ts` — normalizar payload de `getMessages`
2. `backend/src/presentation/controllers/adaptive-ai/adaptive-ai.controller.ts` — adicionar `@Get('suggestions/:ticketId')` (ou substituir o existente)
3. `profile-driven-app/src/lib/api.ts` — `ticketService.updateStatus` mandar enum em uppercase
4. `profile-driven-app/src/routes/_authed/chat.$ticketId.tsx` — alinhar `Message` interface, corrigir `handleClose`/`handleTransfer`
5. `backend/src/presentation/controllers/tickets/tickets.controller.ts` — endpoint para resolver "transferir para nível N2/N3" (hoje só aceita `userId`)

---

## 🐛 Bugs detalhados

### Bug 1 — Shape de `Message` divergente (CRÍTICO — quebra renderização)

**Backend retorna** ([chat.service.ts:44-52](../backend/src/presentation/controllers/chat/chat.service.ts#L44-L52)):
```ts
{
  id: string,
  ticketId: string,
  content: string,
  type: 'TEXT' | 'IMAGE' | ...,
  direction: 'INCOMING' | 'OUTGOING',     // ← discriminator
  senderId: string | null,
  sender: { id, name, role } | null,      // ← objeto aninhado
  waMessageId: string | null,
  isInternal: boolean,
  mentions: string[],
  createdAt: string,
}
```

**Frontend espera** ([chat.$ticketId.tsx:34-43](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L34-L43)):
```ts
{
  id: string,
  content: string,
  sender: 'technician' | 'user' | 'bot',  // ← string literal
  senderName?: string,                     // ← campo flat
  createdAt: string,
  intent?: string, category?: string, confidence?: number,
}
```

**Resultado:** `msg.sender === "technician"` é sempre `false` (porque `msg.sender` é objeto). Todas as bolhas caem no ramo "user" do ternário ([chat.$ticketId.tsx:166-175](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L166-L175)) e `senderName` (linha 38) fica `undefined`.

**Fix recomendado: normalizar no backend** (option A) — não na UI. Razão: o WhatsApp/Hermes já manda `senderType` distinto de `direction` (bot vs human), e o backend tem o `sender.role` pra decidir. Centralizar a derivação evita 3 lugares com mesma lógica.

`chat.service.ts:44-52` deve virar:
```ts
async getMessages(ticketId: string) {
  const rows = await this.prisma.message.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  return rows.map(m => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    // Discriminator que o frontend usa diretamente
    sender: this.deriveSenderType(m),
    senderName: m.sender?.name ?? (m.direction === 'INCOMING' ? 'Cliente' : 'Sistema'),
    isInternal: m.isInternal,
    // Campos AI vêm de outro fluxo; deixar undefined por enquanto
    intent: undefined,
    confidence: undefined,
  }));
}

private deriveSenderType(m: { direction: string; sender: { role?: string } | null }): 'user' | 'technician' | 'bot' {
  if (m.direction === 'INCOMING') return 'user';
  if (!m.sender) return 'bot';                          // mensagem do Hermes/sistema
  if (m.sender.role === 'BOT') return 'bot';
  return 'technician';
}
```

### Bug 2 — `aiService.getSuggestions(ticketId)` aponta pro endpoint errado

**Frontend chama** ([api.ts:122](../profile-driven-app/src/lib/api.ts#L122)):
```ts
getSuggestions: (ticketId: string) => api.get(`/ai/suggestions/${ticketId}`),
```

**Backend tem** ([adaptive-ai.controller.ts:63](../backend/src/presentation/controllers/adaptive-ai/adaptive-ai.controller.ts#L63)):
```ts
@Get('suggestions')
async getSuggestions() {
  return this.adaptiveLearning.getImprovementSuggestions();  // ← outro feature
}
```

Ou seja:
- Backend não tem rota `:ticketId` — `GET /ai/suggestions/abc-123` cai em 404 (não bate o pattern) ou no método sem param ignorando o id.
- O método existente retorna **sugestões de melhoria do modelo** (analytics), não **sugestões de resposta** pro técnico no chat.

**Fix:** criar **novo** endpoint dedicado.

```ts
// adaptive-ai.controller.ts
@Get('reply-suggestions/:ticketId')
async getReplySuggestions(
  @Param('ticketId') ticketId: string,
  @Req() req: any,
) {
  return this.replySuggestionsService.suggest(ticketId, req.user);
  // Deve retornar Array<{ id: string, text: string }>
}
```

E atualizar `api.ts`:
```ts
getSuggestions: (ticketId: string) => api.get(`/ai/reply-suggestions/${ticketId}`),
```

> **Implementação do service:** se MiniMax/Captain não estiver pronto, devolver `[]` é aceitável temporariamente (frontend já trata empty). O importante é o endpoint existir e responder 200 com array.

### Bug 3 — `updateStatus` chama com **verbo HTTP errado** + valor minúsculo

**Frontend** ([api.ts:64](../profile-driven-app/src/lib/api.ts#L64)):
```ts
updateStatus: (id: string, status: string) =>
  api.patch(`/tickets/${id}/status`, { status }),    // ← PATCH errado
```

**Backend** ([tickets.controller.ts:107-113](../backend/src/presentation/controllers/tickets/tickets.controller.ts#L107-L113)):
```ts
@Put(':id/status')                                    // ← PUT, não PATCH
async updateStatus(
  @Param('id') id: string,
  @Body('status') status: TicketStatus,                // ← enum, MAIÚSCULO
) { ... }
```

**Backend Prisma enum** ([schema.prisma](../backend/prisma/schema.prisma)):
```prisma
enum TicketStatus {
  NEW ASSIGNED IN_PROGRESS WAITING_CLIENT RESOLVED CLOSED
}
```

**Validação curl (2026-05-04):**
- `PATCH /tickets/:id/status` → 404 (qualquer casing)
- `PUT /tickets/:id/status {"status":"CLOSED"}` → 200 ✓
- `POST /tickets/:id/close` → 201 ✓ (alternativa dedicada)

`api.patch(...)` cai em 404 antes mesmo de validar o enum. O `catch {}` silencia ([chat.$ticketId.tsx:101-103](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L101-L103)) — usuário vê "Chamado encerrado" no toast mas nada mudou no banco.

**Fix (escolha A ou B):**

**Opção A (rápida — usar endpoint dedicado):** trocar [chat.$ticketId.tsx:handleClose](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L99) pra usar um novo método:
```ts
// api.ts
closeTicket: (id: string) => api.post(`/tickets/${id}/close`),
```
```ts
// chat.$ticketId.tsx
const handleClose = async () => {
  try {
    await ticketService.closeTicket(ticketId);
    toast.success("Chamado encerrado");
    navigate({ to: "/tickets" });
  } catch {
    toast.error("Erro ao encerrar chamado");
  }
};
```

**Opção B (genérica — corrigir `updateStatus` direito):**
```ts
// api.ts
updateStatus: (id: string, status: string) =>
  api.put(`/tickets/${id}/status`, { status }),       // PUT
```
E sempre passar valores em UPPERCASE: `updateStatus(id, "CLOSED")`. Recomenda-se também tipar o param:
```ts
type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
updateStatus: (id: string, status: TicketStatus) => api.put(...);
```

**Recomendação:** A pra `handleClose` (intent claro), B pra outros lugares que mudem status.

Adicionalmente, **remover os `catch {}` silenciosos** dos handlers de ação que ainda existem em `chat.$ticketId.tsx` ([linhas 99-110](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L99-L110)) — substituir por `toast.error("Erro ao ...")` igual ao que já fizemos em `tickets.$id.tsx`.

### Bug 4 — `transfer` espera userId, frontend manda "N2"

**Frontend** ([chat.$ticketId.tsx:108](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L108)):
```ts
await ticketService.transfer(ticketId, "N2");
```

**Backend** ([tickets.controller.ts:98-104](../backend/src/presentation/controllers/tickets/tickets.controller.ts#L98-L104)):
```ts
@Post(':id/transfer')
async transfer(
  @Param('id') id: string,
  @Body('userId') newUserId: string,    // ← UUID esperado
  @Request() req: any,
) {
  return this.ticketsService.transfer(id, newUserId, req.user.id);
}
```

`transfer(id, "N2")` falha com erro de FK (User com id="N2" não existe).

**Fix — duas opções**, escolha conforme a feature pretendida:

**Opção A** (rápida — esconder UI até existir endpoint de escalação por nível): comenta o item "Transferir" do dropdown em `chat.$ticketId.tsx:145-147`. Reabilita quando opção B estiver pronta.

**Opção B** (correta — adicionar endpoint dedicado de escalação por nível):
```ts
// tickets.controller.ts
@Post(':id/escalate')
async escalateToLevel(
  @Param('id') id: string,
  @Body() dto: { targetLevel: 'N2' | 'N3' },
  @Request() req: any,
) {
  return this.ticketsService.escalateToLevel(id, dto.targetLevel, req.user.id);
}
```
Service: aplica `EscalationRule` (já existe no schema da Fase 3) ou pega o usuário "lead" do nível.

Frontend:
```ts
// api.ts
escalate: (ticketId: string, targetLevel: 'N2' | 'N3') =>
  api.post(`/tickets/${ticketId}/escalate`, { targetLevel }),
```
E em `chat.$ticketId.tsx:handleTransfer` usar `ticketService.escalate(ticketId, 'N2')`.

### Bug 5 — UX: chat sem mensagens não tem empty state

Quando `getMessages` retorna `[]` (caso comum em ticket recém-aberto), a área de mensagens fica em branco sem feedback.

**Fix:** adicionar empty state em [chat.$ticketId.tsx:159-165](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L159-L165):
```tsx
{!isLoading && messages.length === 0 && (
  <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground">
    <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
    <p>Nenhuma mensagem ainda.</p>
    <p className="text-xs mt-1">Envie a primeira pra iniciar a conversa.</p>
  </div>
)}
```

---

## ✅ Critérios de aceite

Após o fix, este teste manual deve passar:

1. **Login** em `localhost:5173` como `admin@helpdesk.com` / `admin123`
2. Abrir um ticket existente (ex: o primeiro de `/tickets`)
3. Clicar **Conversar** no ticket — `/chat/<ticketId>` carrega
4. Header mostra `userName` real do solicitante (não "Chat")
5. Se ticket não tem mensagens → empty state visível (não branco)
6. Enviar uma mensagem → bolha aparece à **direita** (lado do técnico) com cor `bg-primary`
7. Recarregar página → mensagem persistida, ainda à direita
8. Botão **Encerrar Chamado** → ticket fica `CLOSED` no DB (verificar com `psql` ou voltar pra `/tickets/$id`)
9. Botão **Transferir** → seja oculto (opção A) seja escala corretamente (opção B)
10. Console do browser **zero erros** durante o fluxo todo (zero 4xx/5xx em Network também)

---

## 🧪 Smoke test sugerido (curl)

Após o fix, dá pra validar contratos sem subir frontend:

```bash
# 1. Login
curl -s -c /tmp/cj.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@helpdesk.com","password":"admin123"}' > /dev/null

# 2. Pegar primeiro ticket
TICKET=$(curl -s -b /tmp/cj.txt http://localhost:3000/api/tickets | jq -r '.tickets[0].id')

# 3. Schema das mensagens (deve ter sender: 'user'|'technician'|'bot' e senderName)
curl -s -b /tmp/cj.txt http://localhost:3000/api/chat/messages/$TICKET | jq '.[0]'

# 4. Sugestões de resposta (deve retornar array, não improvement suggestions)
curl -s -b /tmp/cj.txt http://localhost:3000/api/ai/reply-suggestions/$TICKET | jq

# 5. Encerrar com enum correto
curl -s -b /tmp/cj.txt -X PATCH http://localhost:3000/api/tickets/$TICKET/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"CLOSED"}' | jq

# 6. (opção B) Escalar
curl -s -b /tmp/cj.txt -X POST http://localhost:3000/api/tickets/$TICKET/escalate \
  -H 'Content-Type: application/json' \
  -d '{"targetLevel":"N2"}' | jq
```

---

## 📌 Contexto / o que NÃO fazer

- **Não reintroduzir os fallbacks demo** que foram removidos em §6.8 do checklist. Mocks hardcoded mascararam esses bugs por semanas.
- **Não alterar o `Message` model do Prisma** — `direction` é correto e necessário pro Hermes/WhatsApp. A normalização vai no DTO de resposta do `chat.service.getMessages()`, não no model.
- **Não mexer em `_authed.tsx`, `tickets.index.tsx`, `purchases.tsx`** — esses já foram normalizados na sessão de 2026-05-04 (commit pendente). Verificar `git diff` antes.
- **Não adicionar `import.meta.env.VITE_DEMO`** — foi descartado (mascara mais do que ajuda).

---

## 📚 Referências cruzadas

- Plano vigente: [`IMPLEMENTATION_PLAN_V3.md`](../IMPLEMENTATION_PLAN_V3.md)
- Checklist com §6.8 (integração API↔Frontend): [`IMPLEMENTATION_CHECKLIST.md`](../IMPLEMENTATION_CHECKLIST.md)
- Convenções: [`CLAUDE.md`](../CLAUDE.md), [`AGENTS.md`](../AGENTS.md)
- Schema Prisma: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
