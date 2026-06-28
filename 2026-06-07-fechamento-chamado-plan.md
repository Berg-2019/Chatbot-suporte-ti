# Fechamento de Chamado: Relatório + Mensagem ao Usuário + Pesquisa de Satisfação — Plano de Implementação

> **Para o worker (GLM):** Implemente tarefa a tarefa, em ordem. Commits frequentes (1 por tarefa). Ao terminar, o revisor humano (Claude) valida (typecheck + testes + E2E real).

**Goal:** Ao fechar um chamado, o técnico preenche um **relatório de fechamento** (solução/o que foi feito, tempo) e escreve uma **mensagem personalizada** ao usuário; o usuário recebe essa mensagem **e a pesquisa de satisfação (CSAT)** no WhatsApp; a **nota capturada alimenta o ranking** dos admins (que já existe).

**Decisões do produto (já fechadas):** relatório = formulário no chamado (reusa `close()`); mensagem = personalizada pelo técnico (com padrão editável); satisfação = CSAT por WhatsApp disparado no fechamento + nota capturada para o ranking.

## Estado atual (já investigado)
- `POST /tickets/:id/close` **existe** ([tickets.controller.ts:188](backend/src/presentation/controllers/tickets/tickets.controller.ts#L188)) → `close()` ([tickets.service.ts:507](backend/src/presentation/controllers/tickets/tickets.service.ts#L507)) já salva solução/tempo/peças e manda mensagem ao cliente — **mas não está ligado à UI**.
- O frontend fecha pelo botão "Fechar" chamando `ticketService.updateStatus(id, 'CLOSED')` ([tickets.$id.tsx:70,96](Frontend-chatbot/src/routes/_authed/tickets.$id.tsx#L70)).
- CSAT já existe completo: model `CsatResponse` ([schema.prisma:898](backend/prisma/schema.prisma#L898)), `FlowService.handleRating` (grava a nota), `GET /csat/ranking` + aba "Ranking" no dev console.
- **Bug a corrigir:** `updateStatus(CLOSED)` cria a sessão `wa:session:{phone}` (state `rating`) no Redis ([tickets.service.ts:425-447](backend/src/presentation/controllers/tickets/tickets.service.ts#L425)) p/ o `handleRating` capturar a resposta. O `close()` **não cria essa sessão** → a nota não seria capturada.

**Comandos:** Backend (de `backend/`): typecheck `npx tsc --noEmit --incremental false`; testes `npm test`. Frontend (de `Frontend-chatbot/`): `VITE_API_URL=/api VITE_WS_URL=/ bun run build`; publicar no nginx: `docker run --rm -v chatbot-suporte-ti_frontend_dist:/dest -v "$PWD/dist/client":/src:ro alpine sh -c 'rm -rf /dest/* && cp -r /src/. /dest/'`. O backend dev tem hot-reload.

---

## Task 1: Backend — extrair `sendCsatSurvey` (DRY) e usar no `updateStatus`

**Files:** Modify `backend/src/presentation/controllers/tickets/tickets.service.ts`

- [ ] **Step 1:** Criar método privado reaproveitando o bloco inline de CSAT do `updateStatus` ([tickets.service.ts:425-447](backend/src/presentation/controllers/tickets/tickets.service.ts#L425)):
```typescript
/** Dispara a pesquisa CSAT no WhatsApp e cria a sessão de rating no Redis. */
private async sendCsatSurvey(ticketId: string, phoneNumber: string): Promise<void> {
  const phone = phoneNumber.split('@')[0];
  const ticketNumber = ticketId.slice(0, 8).toUpperCase();
  const csatMessage = `Como você avalia o atendimento do chamado *#${ticketNumber}*?\n\nResponda com uma nota de *1* a *5*:\n1⭐ Péssimo\n2⭐ Ruim\n3⭐ Regular\n4⭐ Bom\n5⭐ Excelente`;
  try {
    await this.redis.set(
      `wa:session:${phone}`,
      JSON.stringify({ state: 'rating', data: { ticketId, messageHistory: [] }, updatedAt: Date.now() }),
      600,
    );
    await this.rabbitmq.publishOutgoingMessage({ to: phoneNumber, text: csatMessage, ticketId });
    this.logger.log(`📊 CSAT enviado para ${phone} (ticket #${ticketNumber})`);
  } catch (err: any) {
    this.logger.warn(`Falha ao enviar CSAT: ${err.message}`);
  }
}
```

- [ ] **Step 2:** No `updateStatus`, substituir o bloco inline (linhas ~425-447) por:
```typescript
setTimeout(() => this.sendCsatSurvey(id, ticket.phoneNumber!), 5000);
```
(Mantendo a mensagem de encerramento que já é enviada antes.)

- [ ] **Step 3:** Typecheck + commit.
```bash
npx tsc --noEmit --incremental false
git commit -am "refactor(tickets): extrair sendCsatSurvey (DRY)"
```

---

## Task 2: Backend — `close()` com mensagem personalizada + disparo do CSAT

**Files:** Modify `backend/src/presentation/controllers/tickets/tickets.service.ts`, `tickets.controller.ts`

- [ ] **Step 1:** Adicionar `responseMessage?: string` ao `closeData` da assinatura de `close()` ([tickets.service.ts:509-525](backend/src/presentation/controllers/tickets/tickets.service.ts#L509)).

- [ ] **Step 2:** No envio ao cliente ([tickets.service.ts:611-651](backend/src/presentation/controllers/tickets/tickets.service.ts#L611)), trocar a montagem do `closeMessage` para usar a mensagem do técnico quando houver, e **remover o trecho de "avalie de 1 a 5"** (o CSAT vira mensagem separada):
```typescript
if (ticket.phoneNumber) {
  const technicianName = ticket.assignedTo?.name || 'Suporte';
  let closeMessage: string;
  if (closeData?.responseMessage?.trim()) {
    closeMessage = closeData.responseMessage.trim();
  } else {
    // padrão (sem prompt de avaliação — o CSAT é enviado em seguida)
    closeMessage = `✅ *Chamado Encerrado*\n\n`;
    if (closeData?.solution) closeMessage += `📝 *Solução:* ${closeData.solution}\n\n`;
    if (partUsages.length > 0) {
      closeMessage += `🔧 *Peças utilizadas:*\n`;
      for (const pu of partUsages) closeMessage += `• ${pu.quantity}x ${pu.partName}\n`;
      closeMessage += `\n`;
    }
    if (closeData?.timeWorked) {
      const h = Math.floor(closeData.timeWorked / 60), m = closeData.timeWorked % 60;
      closeMessage += `⏱️ *Tempo:* ${h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`}\n`;
    }
    closeMessage += `👤 *Técnico:* ${technicianName}`;
  }
  await this.rabbitmq.publishOutgoingMessage({ to: ticket.phoneNumber, text: closeMessage, ticketId: id });
  await this.prisma.ticket.update({ where: { id }, data: { awaitingRating: true } });
  // Pesquisa de satisfação (mensagem separada + sessão de rating)
  setTimeout(() => this.sendCsatSurvey(id, ticket.phoneNumber!), 5000);
}
```

- [ ] **Step 3:** `tickets.controller.ts` ([:188-196](backend/src/presentation/controllers/tickets/tickets.controller.ts#L188)): adicionar `responseMessage?: string;` ao tipo do `@Body() closeData`.

- [ ] **Step 4:** Typecheck + testes + commit.
```bash
npx tsc --noEmit --incremental false && npm test
git commit -am "feat(tickets): close() com mensagem personalizada + dispara CSAT"
```

---

## Task 3: Backend — `handleRating` atualiza a nota no ticket

**Files:** Modify `backend/src/infrastructure/whatsapp/flow.service.ts`

- [ ] **Step 1:** Em `handleRating` ([flow.service.ts:491](backend/src/infrastructure/whatsapp/flow.service.ts#L491)), após criar o `CsatResponse`, atualizar o ticket para a nota aparecer no detalhe e o ranking refletir:
```typescript
await this.prisma.ticket.update({
  where: { id: session.data.ticketId },
  data: { rating: score, ratedAt: new Date(), awaitingRating: false },
}).catch(() => undefined);
```
(O `CsatResponse` já é criado com `assignedToId` → alimenta `GET /csat/ranking`. Não duplicar.)

- [ ] **Step 2:** Typecheck + commit.
```bash
npx tsc --noEmit --incremental false
git commit -am "feat(whatsapp): handleRating atualiza rating/ratedAt no ticket"
```

---

## Task 4: Frontend — `ticketService.close()`

**Files:** Modify `Frontend-chatbot/src/lib/api.ts`

- [ ] **Step 1:** No `ticketService` ([api.ts:118](Frontend-chatbot/src/lib/api.ts#L118)), ao lado de `updateStatus`, adicionar:
```typescript
close: (id: string, data: { solution?: string; timeWorked?: number; responseMessage?: string }) =>
  api.post(`/tickets/${id}/close`, data),
```

---

## Task 5: Frontend — componente `CloseTicketDialog`

**Files:** Create `Frontend-chatbot/src/components/CloseTicketDialog.tsx`

- [ ] **Step 1:** Modal com formulário (usar Dialog/Textarea/Button shadcn já presentes no projeto). Props: `ticketId`, `open`, `onOpenChange`, `onClosed`.
   - Campos: **Solução / o que foi feito** (textarea, obrigatório); **Tempo gasto (min)** (input number, opcional); **Mensagem ao usuário** (textarea — pré-preencher um padrão editável a partir da solução, ex.: `Olá! Seu chamado foi resolvido. ${solution} Qualquer dúvida estamos à disposição.`).
   - Ao salvar: `await ticketService.close(ticketId, { solution, timeWorked, responseMessage })`, toast de sucesso, `onClosed()` (invalidar query do ticket) e fechar o modal. Tratar erro com toast.
   - Sugestão: ao digitar a solução, atualizar o padrão da mensagem **somente** se o técnico ainda não editou a mensagem manualmente.

---

## Task 6: Frontend — ligar o botão "Fechar" ao dialog + exibir relatório/nota

**Files:** Modify `Frontend-chatbot/src/routes/_authed/tickets.$id.tsx`, `Frontend-chatbot/src/routes/_authed/chat.$ticketId.tsx`

- [ ] **Step 1:** Em `tickets.$id.tsx`: quando a ação for **"Fechar"** (`next === 'CLOSED'`, [:70](Frontend-chatbot/src/routes/_authed/tickets.$id.tsx#L70)), em vez de `handleStatusChange('CLOSED')`, abrir o `CloseTicketDialog`. As outras transições continuam usando `updateStatus`.

- [ ] **Step 2:** Exibir o **relatório de fechamento** quando o ticket está `CLOSED`: bloco com `solution`, `timeWorked` (formatado) e a **nota CSAT** (`rating` — ex.: estrelas) quando presente. (Esses campos já vêm no GET do ticket.)

- [ ] **Step 3:** Em `chat.$ticketId.tsx`, o `handleCloseTicket` deve abrir o mesmo `CloseTicketDialog` (em vez do `updateStatus('CLOSED')` direto), para consistência.

- [ ] **Step 4:** Build + publicar no nginx + commit (repo Frontend-chatbot).
```bash
VITE_API_URL=/api VITE_WS_URL=/ bun run build
docker run --rm -v chatbot-suporte-ti_frontend_dist:/dest -v "$PWD/dist/client":/src:ro alpine sh -c 'rm -rf /dest/* && cp -r /src/. /dest/'
git add src/components/CloseTicketDialog.tsx src/lib/api.ts src/routes/_authed/tickets.\$id.tsx src/routes/_authed/chat.\$ticketId.tsx
git commit -m "feat(chat): formulário de fechamento (relatório + mensagem ao usuário)"
```

---

## Task 7: Verificação E2E (WhatsApp pareado)

- [ ] Abrir um chamado com origem WhatsApp (tem `waJid`); no detalhe, clicar **Fechar** → preencher solução/tempo/mensagem → enviar.
- [ ] No WhatsApp do usuário: chega a **mensagem personalizada** e, segundos depois, a **pesquisa CSAT** (1–5).
- [ ] Responder a nota no WhatsApp → conferir `csat_responses` (nota + `assignedToId`) e `tickets.rating` preenchido:
  `docker exec helpdesk_postgres psql -U helpdesk -d helpdesk -c "SELECT \"ticketId\",rating,\"assignedToId\" FROM csat_responses ORDER BY \"respondedAt\" DESC LIMIT 3;"`
- [ ] Dev console → **Ranking**: a nota aparece no ranking do técnico.
- [ ] Detalhe do chamado mostra o **relatório** (solução/tempo) e a **nota**.
- [ ] Logs do backend sem erro (envio da mensagem + CSAT).

---

## Notas para o worker
- **DRY:** reusar `sendCsatSurvey` nos dois caminhos (`updateStatus` e `close`).
- Não duplicar a criação de `CsatResponse` (já é feita no `handleRating`).
- O ranking e os dashboards de satisfação **já existem** — não recriar; só garantir a captura da nota.
- Ao terminar, avisar o revisor (Claude) para validar.
