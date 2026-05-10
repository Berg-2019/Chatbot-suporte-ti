# Spec — Tela de Chat de Mensagens (`/chat/$ticketId`)

> **Origem (2026-05-04):** usuário clicou "Conversar" num ticket e caiu na **lista de conversas** (`/chat`) sem perceber que existia uma tela de detalhe. A rota `/chat/$ticketId` **existe** ([profile-driven-app/src/routes/_authed/chat.$ticketId.tsx](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx), 267 linhas) e foi corrigida no commit `05d4134` (Bugs 1-5 do `CHAT_FIX_HANDOFF.md`), mas a UI atual é **mínima** — basicamente header cinza + lista de mensagens + input. Sem contexto do chamado, sem SLA, sem dados do solicitante, sem ações úteis. Daí a percepção de que "não existe a tela".
>
> Este doc é o spec da **versão completa** que deve ser implementada por MiniMax/próximo agente.

---

## 🎯 Objetivo

Quando o técnico clicar **Conversar** num ticket (botão em [tickets.$id.tsx:230-232](../profile-driven-app/src/routes/_authed/tickets.$id.tsx#L230-L232)) **OU** clicar numa conversa na lista (`/chat`), ele deve cair numa tela onde ele tem **tudo que precisa pra atender o cliente sem voltar pra `/tickets/$id`**:

- Quem é o cliente
- Qual é o problema (título + descrição resumida)
- Status e prioridade do ticket
- Quanto tempo tem até estourar SLA
- Histórico completo da conversa (incluindo mensagens via WhatsApp do Hermes)
- Capacidade de enviar mensagem (texto + anexo de foto)
- Ações rápidas: encerrar, marcar como resolvido, escalar, gerar nota interna
- Sugestões da IA (Captain) integradas

---

## 🧩 Estado atual vs. meta

### ✅ Já existe (não refazer)
- Rota registrada em `routeTree.gen.ts` (`/_authed/chat/$ticketId`)
- Backend endpoints funcionando (validados via curl em 2026-05-04):
  - `GET /api/chat/messages/:ticketId` → array normalizado `{id, content, sender:'user'|'technician'|'bot', senderName, createdAt, isInternal}`
  - `POST /api/chat/messages/:ticketId` → cria + retorna msg normalizada
  - `GET /api/ai/reply-suggestions/:ticketId` → array de sugestões (hoje placeholder `[]`)
- Otimistic update ao enviar (substitui id temp pelo persistido)
- Empty state quando não há mensagens
- Fechamento de chamado via `POST /tickets/:id/close`
- Toast de erro em todas as ações (sem mais `catch {}` silencioso)
- Modal de feedback negativo (ThumbsDown) em mensagens do bot

### ❌ Falta implementar
1. **Header rico com contexto do ticket** (hoje só mostra `"Ticket abc123"` truncado)
2. **Drawer/painel lateral** com detalhes completos (descrição, fotos anexadas, asset afetado, SLA timer)
3. **Anexar foto/arquivo** numa mensagem (hoje só texto)
4. **Distinguir mensagens internas** (notas) das mensagens do cliente — backend já tem `isInternal`, frontend ignora
5. **Indicador "digitando..."** via WebSocket (Socket.IO já existe)
6. **Marcar mensagens como lidas** quando o usuário visualiza (atualizar `unreadCount` da conversa)
7. **Status do canal** (WhatsApp online/offline do Hermes — vir de `/health` ou WS)
8. **Sugestões de resposta inline** (chips clicáveis acima do input, não só num modal)
9. **Atalho de auto-resolve** (chamar `POST /tools/auto-resolve-attempt` do bridge se confiança ≥ 0.85)
10. **Voltar pro ticket completo** (link "Ver chamado" no header → `/tickets/$id`)

---

## 📐 Spec de UI/UX (mobile-first, segue padrão das outras rotas com `safe-top`/`pb-28`)

### Header sticky (z-50)
```
┌─────────────────────────────────────────┐
│  ←  [Avatar] Maria Silva           ⋮    │
│      Ticket #DF27B8D4 · ALTA            │
│      💬 WhatsApp · ⏱️ SLA 1h23m         │
└─────────────────────────────────────────┘
```
- **Avatar** do cliente (gerado a partir do nome com Radix Avatar — fallback iniciais)
- **Nome** do solicitante (vem de `ticket.requester.name` ou `ticket.customerName`)
- **Linha 2:** `#<short id> · <PriorityBadge>` (componente já existe)
- **Linha 3:** canal de origem (WhatsApp/web), SLA countdown ao vivo (verde/amarelo/vermelho)
- **Botão ←:** volta pra `/chat` (lista) — preserva
- **Menu ⋮:** mantém "Encerrar Chamado", **adicionar:** "Ver chamado completo" (→ `/tickets/$id`), "Adicionar nota interna", "Escalar para N2/N3" (apenas se endpoint `/tickets/:id/escalate` existir — Bug 4 do `CHAT_FIX_HANDOFF.md`)

### Body — área de mensagens
- Mantém bolhas atuais (✓ já corretas pós-fix do Bug 1)
- **Adicionar barra superior compacta** colapsável: "Ver detalhes do chamado" → expande mostrando descrição completa, asset afetado (com link `/assets/$id`), categoria, fotos anexadas (carrossel)
- **Mensagens internas** (`isInternal: true`): fundo amarelo claro, prefixo 🔒 "Nota interna — invisível ao cliente"
- **Quebra-data** entre mensagens de dias diferentes (chip centralizado "Hoje" / "Ontem" / "12/04")
- **Indicador "digitando..."** quando WebSocket emitir evento (3 dotinhos animados)

### Footer — input
```
┌─────────────────────────────────────────┐
│ [📎] [Mensagem para Maria...]    [➤]    │
│ [💡 Sugestão 1] [💡 Sugestão 2]         │
│ [🔒 Nota interna toggle]                │
└─────────────────────────────────────────┘
```
- Botão 📎 abre picker de imagem (reusa `tickets.new.tsx:capture="environment"`)
- Chips de sugestões (`getReplySuggestions`) clicáveis — preencher input on-tap
- Toggle "Nota interna" muda o `direction`/flag — backend precisa aceitar `isInternal: boolean` em `POST /chat/messages/:ticketId`

---

## 🛠️ Plano de implementação

### Etapa 1 — carregar contexto do ticket (1h)
- Em [chat.$ticketId.tsx:75](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L75), adicionar segunda `useQuery`:
  ```ts
  const { data: ticket } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => (await ticketService.getTicket(ticketId)).data,
  });
  ```
- Renderizar `ticket.requester.name`, `ticket.priority`, `ticket.title` no header
- Tratar `isError` → fallback de header com só ID + botão "Voltar"

### Etapa 2 — SLA countdown (1h)
- Backend já tem `GET /sla/dashboard` e `SlaTimer` no schema. Criar endpoint `GET /sla/timer/:ticketId` ou incluir `slaTimer` no `ticket.findById` include.
- Frontend: hook `useSlaTimer(ticketId)` que faz polling 30s OU subscreve WS
- Componente `<SlaCountdown deadlineAt={...} />` — verde se >50% restante, amarelo 20-50%, vermelho <20%

### Etapa 3 — ações (2h)
- "Ver chamado completo" → `navigate({ to: '/tickets/$id' })` (já tem rota)
- "Adicionar nota interna" → input com toggle `isInternal: true`. Backend precisa aceitar (modificar `POST /chat/messages/:ticketId` body)
- "Escalar N2/N3" → após Bug 4 do handoff resolvido (criar `POST /tickets/:id/escalate`)
- Anexar foto → reutilizar `tickets.new.tsx` lógica (browser-image-compression + multipart)

### Etapa 4 — sugestões inline + nota interna distinta (1h)
- Chips sticky acima do input (Sparkles + texto truncado)
- Estilizar bolhas com `isInternal` em amarelo + cadeado

### Etapa 5 — WebSocket / typing / read receipts (3h, opcional fase 2)
- Reaproveitar `team-chat.gateway.ts` ou criar `chat.gateway.ts`
- Eventos: `chat:typing`, `chat:message`, `chat:read`
- Frontend: hook `useChatSocket(ticketId)`

**Total: ~7h** (sem WS) ou **10h** (com WS).

---

## 🔌 Contratos de endpoint que precisam mudar

### `POST /api/chat/messages/:ticketId` (ajustar)
**Body atual:** `{ content: string }`
**Body novo:** `{ content: string, isInternal?: boolean, attachments?: File[] (multipart) }`

### `GET /api/sla/timer/:ticketId` (criar, OU incluir no `ticket.findById`)
**Resposta:** `{ deadlineAt: ISO, breachedAt: ISO|null, pausedAt: ISO|null, totalPausedMs: number }`

### `POST /api/tickets/:id/escalate` (Bug 4 do handoff — pendente)
**Body:** `{ targetLevel: 'N2'|'N3' }`
**Resposta:** ticket atualizado com novo `assignedToId`

### `GET /api/ai/reply-suggestions/:ticketId` (já existe, hoje retorna `[]`)
- Implementar de fato consumindo o `RAGService` (similar conversations) + `MiniMax`/`Captain`
- Resposta esperada: `Array<{id: string, text: string, confidence?: number}>`

---

## 🐛 Bug paralelo — `GET /api/tickets/1002` 404

Console mostrou 4× requests pra ticket id `1002` que não existe. Não tem refs hardcoded a `1002` no código (`grep` confirmou). Provável origem:
- URL bookmarkada de quando o `demoTicket()` fallback ainda existia
- Ou cache do TanStack Query com `queryKey: ['ticket', '1002']` antigo

**Mitigação:** ao acessar `/tickets/$id` com id que retorna 404, [tickets.$id.tsx:148-156](../profile-driven-app/src/routes/_authed/tickets.$id.tsx#L148-L156) já renderiza tela de erro com botão "Voltar". Funciona, mas fica fazendo retry (TanStack Query default 3x). **Adicionar:**
```ts
useQuery({ ..., retry: false })
```
para evitar os 4 requests no console.

---

## ✅ Critérios de aceite

1. Login `admin@helpdesk.com`. Abrir um ticket de `/tickets`.
2. Clicar **"Conversar"** → cai em `/chat/$ticketId` (não na lista).
3. Header mostra: avatar + nome do solicitante + #ID curto + priority badge + SLA countdown.
4. Painel "Ver detalhes" expande mostrando descrição + asset afetado.
5. Enviar texto → bolha à direita, persiste após reload.
6. Anexar foto → bolha com thumb, foto baixa do servidor após reload.
7. Toggle "Nota interna" → bolha amarela com cadeado, **não** aparece no histórico via WhatsApp do cliente.
8. Chip de sugestão preenche input on-tap.
9. Menu ⋮ → "Encerrar Chamado" muda status pra `CLOSED`, navega pra `/tickets`.
10. Menu ⋮ → "Ver chamado completo" → vai pra `/tickets/$id`.
11. Console **zero erros** durante o fluxo todo.

---

## 📚 Referências

- [`CHAT_FIX_HANDOFF.md`](CHAT_FIX_HANDOFF.md) — bugs prévios já resolvidos no commit `05d4134`
- [`IMPLEMENTATION_CHECKLIST.md §6.9`](../IMPLEMENTATION_CHECKLIST.md) — status dos bugs
- Schema Prisma `Message` model — `direction`, `isInternal`, `mentions`
- Backend `chat.service.ts:getMessages` — DTO normalizado
- Componente `BottomNav.tsx:24` — esconde a nav quando rota é `/chat/<algo>` (UX correta para tela de chat fullscreen)
