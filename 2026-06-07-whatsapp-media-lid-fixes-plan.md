# Correções WhatsApp: entrega ao agente (LID), mídia na saída e mídia na entrada — Plano de Implementação

> **Para o worker (GLM):** Implemente tarefa a tarefa, em ordem. Commits frequentes (1 por tarefa). NÃO pule a Task 0 (confirma a causa raiz #1). Ao terminar, o revisor humano (Claude) valida.

**Goal:** Fazer (A) as mensagens do **agente** (chat do sistema) chegarem ao WhatsApp do usuário, (B) **mídia de saída** (imagem/áudio do agente) ser enviada, e (C) **mídia de entrada** (imagem/áudio do usuário) chegar ao agente.

**Diagnóstico (já investigado — causa raiz confirmada):**
- **RC#1 (saída agente→usuário não chega):** o usuário aparece com um **LID** do WhatsApp (`msg.key.remoteJid` = `<num>@lid`, ex.: `126087875031102@lid`). O **bot** responde com `send(from,…)` usando o jid completo → funciona. Mas o **agente** (ChatService → fila `outgoing_messages` → consumidor) usa `ticket.phoneNumber` (número cru) e o consumidor remonta `<num>@s.whatsapp.net` ([baileys.service.ts:222](backend/src/infrastructure/whatsapp/baileys.service.ts#L222)) → endereço inválido → `sendText` retorna um `key.id` (banco marca `enviado=t`) mas **o WhatsApp não entrega**.
- **RC#2 (saída de mídia nunca sai):** `consumeOutgoingMessages` só chama `sendText`, ignora `mediaUrl`/`mediaType`, e faz `return` se não houver texto ([baileys.service.ts:213-235](backend/src/infrastructure/whatsapp/baileys.service.ts#L213-L235)). O método `sendMedia` existe e está correto, mas nunca é chamado.
- **RC#3 (entrada de mídia descartada):** no `messages.upsert`, `const text = this.extractText(msg); if (!text) continue;` ([baileys.service.ts:136-137](backend/src/infrastructure/whatsapp/baileys.service.ts#L136)). `extractText` não tem caso `audioMessage` (áudio→null→descartado), imagem sem legenda→descartada, e **a mídia nunca é baixada/persistida**.

**Tech Stack:** NestJS, Prisma/Postgres, `@whiskeysockets/baileys ^7`, RabbitMQ, Jest.

**Comandos (backend, a partir de `backend/`):**
- Typecheck: `npx tsc --noEmit --incremental false`
- Testes: `npm test`
- Migration: `docker exec helpdesk_backend_dev npx prisma migrate dev --name <nome>` e depois `docker exec helpdesk_backend_dev npx prisma generate` **(obrigatório regenerar o client DENTRO do container)** + `docker compose -f docker-compose.dev.yml restart backend`.

**Fatos úteis confirmados:**
- Mídia do agente é salva em disco em `uploads/messages/<arquivo>`; `Message.mediaUrl` = `/uploads/messages/<arquivo>` ([chat.service.ts:109](backend/src/presentation/controllers/chat/chat.service.ts#L109)).
- `ChatService` já publica `mediaUrl`, `mediaType` (lowercase: image/audio/video/document) e `filename` para `outgoing_messages` ([chat.service.ts:157-168](backend/src/presentation/controllers/chat/chat.service.ts#L157)).
- `Message` tem campos `mediaUrl, fileName, fileSize, duration, thumbnailUrl`. Enum `MessageType`: TEXT/IMAGE/AUDIO/VIDEO/DOCUMENT.
- `FlowService.handleMessage(from, text, waMessageId)`: `from` = jid completo; `phone = from.split('@')[0]`. Ticket criado com `phoneNumber: phone` ([flow.service.ts:301-306](backend/src/infrastructure/whatsapp/flow.service.ts#L301)).

---

## Task 0: Confirmar o LID (causa raiz #1) — ✅ JÁ CONFIRMADO (2026-06-07)

> **Resultado da verificação (pode PULAR esta task):** log do `remoteJid` cru com mensagens reais de teste confirmou:
> ```
> remoteJid=126087875031102@lid | tipos=extendedTextMessage   (texto)
> remoteJid=126087875031102@lid | tipos=imageMessage          (imagem)
> remoteJid=126087875031102@lid | tipos=audioMessage          (áudio)
> ```
> → **RC#1 confirmada:** jid é `@lid`. **RC#3 confirmada:** imagem=`imageMessage`, áudio=`audioMessage` (sem caso no `extractText`). Siga direto para a Task 1. (Passos abaixo mantidos só como referência caso precise reproduzir.)

**Files:** Modify `backend/src/infrastructure/whatsapp/baileys.service.ts`

- [ ] **Step 1: Logar o `remoteJid` cru no handler de entrada**

Em `messages.upsert`, logo após `const from = msg.key.remoteJid;`, adicione:
```typescript
this.logger.log(`[diag] remoteJid bruto: ${from}`);
```

- [ ] **Step 2: Rebuild + pedir 1 mensagem de teste**

`docker compose -f docker-compose.dev.yml restart backend`. Peça para o humano enviar **uma** mensagem do WhatsApp de teste. Rode:
`docker logs helpdesk_backend_dev 2>&1 | grep "remoteJid bruto" | tail -1`

- [ ] **Step 3: Verificar o sufixo**

Esperado: confirma `@lid` (ex.: `126087875031102@lid`). 
- Se for `@lid` → RC#1 confirmada, seguir Task 1.
- Se for `@s.whatsapp.net` com número diferente do esperado → reportar ao revisor antes de prosseguir.

- [ ] **Step 4: Remover o log de diagnóstico** (ou rebaixar para `debug`) e commitar.

```bash
git add backend/src/infrastructure/whatsapp/baileys.service.ts
git commit -m "chore(whatsapp): diag temporário de remoteJid (RC#1 LID) — revertido"
```

---

## Task 1: RC#1 — Responder ao jid original (LID-safe)

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/infrastructure/whatsapp/flow.service.ts`
- Modify: `backend/src/presentation/controllers/chat/chat.service.ts`
- Test: `backend/src/presentation/controllers/chat/chat.service.spec.ts` (criar se não existir)

- [ ] **Step 1: Schema — adicionar `waJid` ao Ticket**

No `model Ticket`, adicionar:
```prisma
  waJid String? // jid completo do WhatsApp de origem (suporta @lid). Usado para responder.
```
Migration:
`docker exec helpdesk_backend_dev npx prisma migrate dev --name add_ticket_wajid`
→ depois `docker exec helpdesk_backend_dev npx prisma generate` + restart backend.

- [ ] **Step 2: FlowService — persistir o jid completo**

(a) Na criação do ticket ([flow.service.ts:301](backend/src/infrastructure/whatsapp/flow.service.ts#L301)), adicionar `waJid: from` ao `data`. (Garanta que `from` esteja no escopo do método que cria; se o método só tem `phone`, propague `from`.)

(b) Auto-cura para tickets já existentes: em `handleMessage`, logo após resolver `phone`/`from`, adicionar:
```typescript
// Atualiza o jid de resposta de tickets abertos deste contato (corrige LID em tickets antigos)
await this.prisma.ticket.updateMany({
  where: { phoneNumber: phone, status: { not: 'CLOSED' }, OR: [{ waJid: null }, { waJid: { not: from } }] },
  data: { waJid: from },
}).catch(() => undefined);
```

- [ ] **Step 3: ChatService — usar `waJid` na saída**

Em `sendMessage`, no `findUnique` do ticket ([chat.service.ts:147-150](backend/src/presentation/controllers/chat/chat.service.ts#L147)), incluir `waJid: true` no `select`. No `publishOutgoingMessage`, trocar:
```typescript
to: ticket.phoneNumber,
```
por:
```typescript
to: ticket.waJid ?? ticket.phoneNumber,
```
E ajustar a condição de guarda para publicar se houver `waJid` OU `phoneNumber`:
```typescript
const dest = ticket?.waJid ?? ticket?.phoneNumber;
if (dest) { /* ...publish com to: dest... */ }
```

- [ ] **Step 4: Teste (ChatService)**

Mock do Prisma retornando ticket `{ waJid: '126@lid', phoneNumber: '126' }` → espera `publishOutgoingMessage` chamado com `to: '126@lid'`. E ticket `{ waJid: null, phoneNumber: '5569...' }` → `to: '5569...'`.

- [ ] **Step 5: Typecheck + testes + commit**

```bash
npx tsc --noEmit --incremental false && npm test
git add backend/prisma backend/src/infrastructure/whatsapp/flow.service.ts backend/src/presentation/controllers/chat
git commit -m "fix(whatsapp): responder ao jid original (LID-safe) via Ticket.waJid"
```

---

## Task 2: RC#2 — Enviar mídia na saída (consumidor)

**Files:** Modify `backend/src/infrastructure/whatsapp/baileys.service.ts`

- [ ] **Step 1: Rotear mídia para `sendMedia` no `consumeOutgoingMessages`**

Substituir o corpo do callback de `consume` por (mantendo a atualização de `waMessageId`):
```typescript
const { to, text, content, messageId, mediaUrl, mediaType, filename } = data;
if (!to) return;
const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
const caption = (text || content || '') as string;

let waId: string | null = null;
if (mediaUrl && mediaType) {
  try {
    const fileName = path.basename(String(mediaUrl).split('/').pop() || 'arquivo');
    const filePath = path.join(process.cwd(), 'uploads', 'messages', fileName);
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Mídia não encontrada em disco: ${filePath}`);
      return;
    }
    const buffer = fs.readFileSync(filePath);
    waId = await this.sendMedia(jid, buffer, mediaType, caption || undefined, filename || fileName);
  } catch (err: any) {
    this.logger.error(`Erro ao enviar mídia outgoing: ${err.message}`);
    return;
  }
} else {
  if (!caption) return; // texto vazio e sem mídia → nada a enviar
  waId = await this.sendText(jid, caption);
}

if (waId && messageId) {
  try {
    await this.prisma.message.update({ where: { id: messageId }, data: { waMessageId: waId } });
    this.logger.debug(`Outgoing enviado: ${waId} (msg: ${messageId})`);
  } catch { /* message may not exist */ }
}
```
> `fs` e `path` já são importados no arquivo. `mediaType` chega em lowercase (image/audio/video/document) — compatível com `sendMedia`.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit --incremental false && npm test
git add backend/src/infrastructure/whatsapp/baileys.service.ts
git commit -m "fix(whatsapp): enviar mídia na saída (sendMedia no consumidor)"
```

---

## Task 3: RC#3 — Receber mídia (imagem/áudio/vídeo/documento)

**Files:**
- Modify: `backend/src/infrastructure/whatsapp/baileys.service.ts`
- Modify: `backend/src/infrastructure/whatsapp/flow.service.ts`
- Modify: `backend/src/presentation/controllers/messages/messages.service.ts`

- [ ] **Step 1: Baileys — detectar tipo de mídia + baixar + persistir em disco**

(a) Importar `downloadMediaMessage` de `@whiskeysockets/baileys` (adicionar ao import existente). Importar `randomUUID` de `crypto`.

(b) Adicionar helper para mapear o tipo:
```typescript
private detectMedia(msg: proto.IWebMessageInfo):
  { type: 'IMAGE'|'AUDIO'|'VIDEO'|'DOCUMENT'; mime?: string; fileName?: string } | null {
  const m = msg.message; if (!m) return null;
  if (m.imageMessage)    return { type: 'IMAGE',    mime: m.imageMessage.mimetype || 'image/jpeg' };
  if (m.audioMessage)    return { type: 'AUDIO',    mime: m.audioMessage.mimetype || 'audio/ogg' };
  if (m.videoMessage)    return { type: 'VIDEO',    mime: m.videoMessage.mimetype || 'video/mp4' };
  if (m.documentMessage) return { type: 'DOCUMENT', mime: m.documentMessage.mimetype || 'application/octet-stream', fileName: m.documentMessage.fileName || undefined };
  return null;
}

private extMime(mime?: string): string {
  if (!mime) return 'bin';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('pdf')) return 'pdf';
  return (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
}

private async downloadAndSaveMedia(msg: proto.IWebMessageInfo, media: { type: string; mime?: string; fileName?: string }): Promise<{ mediaUrl: string; fileName: string } | null> {
  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: this.baileysLogger as any, reuploadRequest: this.sock!.updateMediaMessage });
    const dir = path.join(process.cwd(), 'uploads', 'messages');
    fs.mkdirSync(dir, { recursive: true });
    const fileName = media.fileName || `${randomUUID()}.${this.extMime(media.mime)}`;
    fs.writeFileSync(path.join(dir, fileName), buffer as Buffer);
    return { mediaUrl: `/uploads/messages/${fileName}`, fileName };
  } catch (err: any) {
    this.logger.error(`Falha ao baixar mídia: ${err.message}`);
    return null;
  }
}
```
> Use o mesmo `pino` logger já criado no serviço (ex.: `this.baileysLogger`); se não existir um campo, passe `pino({ level: 'silent' })` inline.

(c) Reescrever o trecho do `messages.upsert` para NÃO descartar mídia. Trocar:
```typescript
const text = this.extractText(msg);
if (!text) continue;
...
await this.onMessageCallback(from, text, msg);
```
por:
```typescript
const text = this.extractText(msg);
const media = this.detectMedia(msg);
if (!text && !media) continue;

let saved: { mediaUrl: string; fileName: string } | null = null;
if (media) saved = await this.downloadAndSaveMedia(msg, media);

if (this.onMessageCallback) {
  try {
    await this.onMessageCallback(from, text || '', msg, media && saved
      ? { type: media.type as any, mediaUrl: saved.mediaUrl, fileName: saved.fileName }
      : undefined);
  } catch (err: any) {
    this.logger.error(`Erro ao processar mensagem: ${err.message}`);
  }
}
```

(d) Estender a assinatura do callback `onMessage`/`onMessageCallback` para um 4º parâmetro opcional `media?: { type: 'IMAGE'|'AUDIO'|'VIDEO'|'DOCUMENT'; mediaUrl: string; fileName: string }`.

- [ ] **Step 2: MessagesService — aceitar mídia em `createFromWhatsApp`**

Estender a assinatura para receber `mediaUrl?`, `fileName?` e repassar ao `create(...)`:
```typescript
async createFromWhatsApp(ticketId: string, content: string, waMessageId: string, type: MessageType = 'TEXT', mediaUrl?: string, fileName?: string) {
  // ...dedupe igual...
  const message = await this.create({ ticketId, content, direction: 'INCOMING', waMessageId, type, mediaUrl, fileName });
  // ...
}
```
> Confirme que `CreateMessageDto` e o `create()` repassam `mediaUrl`/`fileName` ao `prisma.message.create` (adicione os campos se faltarem).

- [ ] **Step 3: FlowService — registrar a mídia recebida no ticket**

No `this.baileys.onMessage(async (from, text, msg, media) => { ... })`, quando `media` existir:
- Resolver/abrir o ticket do contato (mesma lógica já usada para texto).
- Persistir a mensagem com `MessagesService.createFromWhatsApp(ticketId, text || legenda || '[mídia]', waMessageId, media.type, media.mediaUrl, media.fileName)`.
- Emitir o evento de socket de nova mensagem (como já é feito para texto) para o agente ver em tempo real.
- Para o fluxo conversacional: tratar a mídia como conteúdo do problema quando estiver coletando (ex.: anexar ao ticket e seguir o estado atual). Se não houver ticket ainda, criar/continuar o fluxo normalmente usando a legenda como texto.

- [ ] **Step 4: Teste (detecção/mapeamento)**

Unit test do `detectMedia`/`extMime` (mapeamento de mimetypes → tipo/extensão). (Download real do Baileys não é unit-testável; cobrir só o mapeamento.)

- [ ] **Step 5: Typecheck + testes + commit**

```bash
npx tsc --noEmit --incremental false && npm test
git add backend/src/infrastructure/whatsapp backend/src/presentation/controllers/messages
git commit -m "fix(whatsapp): receber e persistir mídia de entrada (imagem/áudio/vídeo/doc)"
```

---

## Task 4: Verificação E2E manual (com WhatsApp real pareado)

- [ ] Rebuild backend + `prisma generate` no container + restart.
- [ ] Bot pareado (`GET /api/whatsapp/qr` se preciso).
- [ ] **A (RC#1):** abrir um ticket via WhatsApp; responder pelo **chat do sistema** (agente) com **texto** → chega no WhatsApp do usuário. Confirmar no banco que o ticket tem `waJid` preenchido.
- [ ] **B (RC#2):** responder pelo chat do sistema com **imagem** e com **áudio** → chegam no WhatsApp do usuário.
- [ ] **C (RC#3):** enviar do WhatsApp do usuário uma **imagem** (com e sem legenda) e um **áudio** → aparecem para o agente no chat do sistema, com a mídia acessível (`/chat/media/:id`).
- [ ] Conferir logs sem erro (`Erro ao enviar mídia`, `Falha ao baixar mídia`).

---

## ✅ Status QA (validado por Claude em 2026-06-07)
Tasks 1–3 do GLM **funcionam**: RC#1 (responder ao `waJid`/`@lid`) confirmada entregando no WhatsApp real; RC#2 (sendMedia) envia mídia em tickets com `waJid`; RC#3 baixa/salva/serve mídia de entrada. As 3 pendências abaixo (Tasks 5–6) saíram do teste prático.

---

## Task 5: Frontend — renderizar mídia do backend + exibir nome do técnico

**Files:** Modify `Frontend-chatbot/src/routes/_authed/chat.$ticketId.tsx`

**Problema:** o componente faz `setMessages(res.data)` sem mapear e o render usa `msg.content` como URL da mídia. Como o backend manda a URL em `mediaUrl` (`/chat/media/:id`) e `content` = `[mídia]`/`[áudio]`, a mídia **vinda do servidor** não carrega (aparece o texto/placeholder). O nome do remetente (`senderName`) nunca é exibido.

- [ ] **Step 1: Adicionar `mediaUrl` ao tipo `Message`**

No `type Message` (~linha 48-57), adicionar:
```typescript
  mediaUrl?: string | null;
```

- [ ] **Step 2: Helper de URL absoluta da mídia**

No topo do componente (ou util):
```typescript
const API_BASE = (import.meta as any).env?.VITE_API_URL || "";
const mediaSrc = (m: Message) => (m.mediaUrl ? `${API_BASE}${m.mediaUrl}` : m.content);
```
> `m.mediaUrl` vem como `/chat/media/:id`. Em produção (mesmo origin via nginx) o cookie httpOnly é enviado no `<img>/<audio>` normalmente. Em dev com `VITE_API_URL` apontando para outra origem (`:3000`), requisições de `<img>` não mandam o cookie cross-site — usar mesmo-origin (nginx) para testar mídia carregada.

- [ ] **Step 3: Render usar `mediaSrc(msg)` em vez de `msg.content`**

No `MessageBody`/render de mídia (~linhas 597-628), trocar `src={msg.content}` por `src={mediaSrc(msg)}` para image/video/audio/file. (O `content` continua sendo usado só no caso `text`.) Mensagens **otimistas** do próprio agente (blob local) continuam funcionando: elas não têm `mediaUrl`, então `mediaSrc` cai em `content` (o blob).

- [ ] **Step 4: Exibir o nome do técnico acima da mensagem**

No render (~linha 349), para o primeiro item de um grupo (`!grouped`) de mensagens do técnico/bot (`!mine` é o cliente; queremos mostrar o nome do **técnico**, lado `mine`), adicionar um rótulo com `msg.senderName` acima da bolha. Ex.: quando `mine && !grouped && msg.senderName && msg.senderName !== 'Você'`, renderizar:
```tsx
<span className="text-[10px] text-muted-foreground px-1 mb-0.5 block text-right">{msg.senderName}</span>
```
(Posicionar fora/above da bolha; ajustar à UI existente. O objetivo é o cliente/agente identificar QUEM respondeu.)

- [ ] **Step 5: Build + commit (no repo Frontend-chatbot)**

```bash
cd Frontend-chatbot && bun run build
git add src/routes/_authed/chat.\$ticketId.tsx
git commit -m "fix(chat): renderizar mídia via mediaUrl + exibir nome do técnico"
```

---

## Task 6: Backend — identificar o técnico nas mensagens enviadas ao WhatsApp

**Files:** Modify `backend/src/presentation/controllers/chat/chat.service.ts`

**Objetivo:** quando o agente responde, o usuário no WhatsApp deve ver quem está atendendo (ex.: `*Matheus (TI):*` antes da mensagem).

- [ ] **Step 1: Prefixar texto/legenda com o nome do técnico no publish**

No bloco de publish OUTGOING ([chat.service.ts:146-170](backend/src/presentation/controllers/chat/chat.service.ts#L146)), montar o texto com o nome do remetente quando houver `msg.sender?.name` e **não** for bot:
```typescript
const senderLabel = msg.sender && msg.sender.role !== 'BOT' && msg.sender.name
  ? `*${msg.sender.name}*\n`
  : '';
const waText = input.content ? `${senderLabel}${input.content}` : input.content;
```
Usar `waText` nos campos `text` e `content` do `publishOutgoingMessage`. (Para mídia, `waText` vira a legenda — o nome aparece junto da imagem/áudio.)
> Garanta que o `select`/`include` do `msg` traga `sender { name, role }` (o `create` já inclui `sender: { select: { id, name, role } }`). Não prefixar mensagens internas (`isInternal`) — essas nem vão ao WhatsApp.

- [ ] **Step 2: Typecheck + commit**

```bash
cd backend && npx tsc --noEmit --incremental false && npm test
git add src/presentation/controllers/chat/chat.service.ts
git commit -m "feat(whatsapp): identificar o técnico (nome) nas mensagens enviadas ao usuário"
```

- [ ] **Step 3: Verificação E2E**
- Responder pelo chat (texto e imagem) num ticket WhatsApp → no celular do usuário a mensagem vem com `*Nome do técnico*` no topo/legenda.
- No chat do sistema, o nome do técnico aparece acima das mensagens dele.
- Mídia recebida do usuário (imagem/áudio) renderiza no chat (não mais `[mídia]`/`[áudio]`).

---

## Notas para o worker
- **Não** remontar `<num>@s.whatsapp.net` quando houver jid original — sempre preferir `waJid`.
- Mídia em disco vive em `uploads/messages/`; manter esse padrão para entrada e saída.
- `mediaType` na saída chega em lowercase; `MessageType` no banco é UPPERCASE — não confundir.
- `prisma generate` **dentro do container** após qualquer mudança de schema (senão o backend não compila lá — gotcha conhecido).
- Best-effort no envio: falha de mídia loga e não derruba o fluxo.
- Ao terminar, avisar o revisor (Claude) para validar (typecheck + testes + E2E).
