# Spec — Messenger interno unificado na aba Chat (grupos + DMs, estilo WhatsApp)

> Data: 2026-06-27 · Status: aprovado, em implementação
> Substitui a aba "Equipe" (criada no item 13 do diário) e o `team-chat` antigo.

## Problema
Existem hoje **duas** abas de chat parecidas: "Chat" (que já é o chat interno via `TeamChatPanel`/canais de setor) e "Equipe" (chat de setor que adicionei). Confuso. O usuário quer **uma** experiência estilo WhatsApp dentro da aba **Chat**: barra lateral de conversas com o **grupo da equipe** + **chats privados** (admin↔agente, agente↔agente).

## Decisões (com o usuário)
- **DM:** apenas **mesmo setor**; **ADMIN global** (role `ADMIN`) fala com qualquer setor.
- **Lista lateral:** **só interno** (grupo + DMs). Conversa com cliente continua dentro do chamado (`/tickets/$id`); `/chat/conversations` (cliente/WhatsApp) fica **intacto**.
- **Grupos:** só **1 grupo por setor** (sem grupos personalizados — YAGNI).
- **Não-lidas:** **sim**, badge por conversa + total na aba Chat.
- **Mobile estilo WhatsApp:** lista em tela cheia → tocar abre a thread em **tela cheia** (header com voltar + avatar + nome + status), **sem BottomNav** na thread. Desktop: 2 painéis lado a lado.

## Modelo de dados (Prisma)
```prisma
enum ConversationType { GROUP DIRECT }

model ChatConversation {
  id            String            @id @default(uuid())
  type          ConversationType
  sector        Sector?           // preenchido só em GROUP
  createdAt     DateTime          @default(now())
  lastMessageAt DateTime          @default(now())
  participants  ChatParticipant[]
  messages      ChatMessage[]
  @@index([lastMessageAt])
  @@index([type, sector])
}

model ChatParticipant {
  id             String           @id @default(uuid())
  conversationId String
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  lastReadAt     DateTime?
  createdAt      DateTime         @default(now())
  @@unique([conversationId, userId])
  @@index([userId])
}

model ChatMessage {
  id             String           @id @default(uuid())
  conversationId String
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User             @relation(fields: [senderId], references: [id], onDelete: Cascade)
  content        String
  createdAt      DateTime         @default(now())
  @@index([conversationId, createdAt])
}
```
`TeamMessage` fica órfão (não migro histórico — descartável; a tabela não é dropada nesta migration).

## Regras de provisionamento
- **Grupo do setor:** 1 `GROUP` por setor, criado *lazy*. Ao listar conversas, garante a conversa GROUP do setor do usuário **e** o `ChatParticipant` dele (pra ter `lastReadAt`).
- **DM:** `openDirect(targetUserId)` acha a `DIRECT` existente entre os 2 (ou cria com 2 participantes). Valida **mesmo setor** (ADMIN global isento). Bloqueia `targetUserId === me`.
- **Membros do grupo:** implicitamente todos do setor; o `ChatParticipant` é criado sob demanda (ao listar/abrir).

## Endpoints (`/messenger`, `@UseGuards(AuthGuard('jwt'))`)
Prefixo novo pra não colidir com `/chat/conversations` (cliente).
- `GET /messenger/conversations` → `[{ id, type, title, sector?, lastMessage{content,senderName,createdAt}|null, unreadCount, otherUser?{id,name,status} }]`, ordenado por `lastMessageAt desc`, **grupo fixado no topo**.
- `GET /messenger/conversations/:id/messages?before=<cursor>` → histórico (50), `include sender{id,name}`. **Valida participante (anti-IDOR) → 403.**
- `POST /messenger/conversations/:id/read` → `lastReadAt = now` (do participante autenticado).
- `POST /messenger/direct/:userId` → cria/retorna `{ conversationId }` (mesmo setor / admin global).
- `GET /messenger/contacts` → usuários do mesmo setor (exclui você) `[{id,name,role,status}]` pra iniciar DM.

Anti-IDOR: toda operação por conversa valida que `req.user.id` é participante.

## WebSocket (`events.gateway`, namespace default já conectado)
- `handleConnection`: além do que já faz, junta a **sala pessoal** `user:<id>`.
- `@SubscribeMessage('chat:send')` `{ conversationId, content }` → valida participante → persiste `ChatMessage` → `lastMessageAt = now` → emite:
  - `chat:message` (mensagem completa) para `user:<id>` de **todos os participantes** (remetente inclusive → sem optimistic).
  - `chat:conversation` (resumo: id, lastMessage, p/ atualizar a sidebar + unread).
- Remove `team:join` / `team:message`.

## Não-lidas
- `unreadCount(conv, me)` = `count(ChatMessage where conversationId, createdAt > participant.lastReadAt (ou epoch se null), senderId != me)`.
- Total = soma → **badge na aba Chat** (BottomNav) e na entrada do painel admin. Atualiza em tempo real via `chat:conversation`; **zera ao abrir** (chama `read`).

## Frontend — aba Chat em 2 painéis (e mobile WhatsApp)
Estrutura de rotas:
- `chat.tsx` (layout): **desktop** renderiza `ConversationList` (fixa à esquerda) + `<Outlet/>`; **mobile** renderiza só `<Outlet/>`.
- `chat.index.tsx` (`/chat`): **mobile** = `ConversationList` em tela cheia; **desktop** = estado vazio ("selecione uma conversa") ao lado da lista.
- `chat.$conversationId.tsx` (`/chat/<id>`): `ChatThread` da conversa. (Reaproveita o slot da rota dinâmica; valida que a antiga `chat.$ticketId` não está em uso — senão renomear pra evitar colisão.)

Componentes:
- **`ConversationList`** — grupo fixado no topo + DMs; cada linha: avatar/inicial, nome, prévia da última msg, hora, **badge não-lidas**. Botão "Nova conversa" → `ContactPicker`.
- **`ChatThread`** — header (no mobile: **voltar** + avatar + nome + status; some o BottomNav) + bolhas (generaliza a UI do `TeamChat` atual) + composer. Marca **lido** ao montar.
- **`ContactPicker`** — modal/sheet com usuários do setor (status online); selecionar → `POST /messenger/direct/:userId` → navega pra `/chat/<id>`.
- **`useMessenger`** — hook: query de conversas, mensagens, mutations (send via WS, read), assinaturas `chat:message`/`chat:conversation`.

Navegação mobile (WhatsApp): lista em `/chat` (com BottomNav) → toca conversa → navega `/chat/<id>` (thread tela cheia, **BottomNav escondido** via `pathname` em `/chat/<algo>`) → voltar volta pra lista. Desktop: selecionar conversa só troca o `<Outlet/>`, lista permanece à esquerda.

## Aposentadorias
- Remove a aba **"Equipe"** do `BottomNav` e a página `/admin/team` → vira entrada **"Mensagens"** no painel admin reusando o mesmo messenger.
- Aposenta `TeamChatPanel`, `TeamChat`, `team-chat.controller`, `team-chat.gateway`, `team-chat.module` e os handlers `team:*` do `events.gateway`. **Cliente (`/chat/conversations`) intacto.**
- `BottomNav`: esconder na thread (`/chat/<id>`); manter mostrando na lista (`/chat`).

## Verificação
- **Backend jest:** `openDirect` mesmo-setor OK / cross-setor bloqueado (admin global OK); `unreadCount`; `listConversations` (grupo no topo); anti-IDOR (não-participante → 403).
- **curl:** criar DM, enviar via REST/WS, unread incrementa p/ o destinatário, `read` zera, não-participante → 403.
- **E2E ao vivo (2 navegadores):** admin↔agente DM em tempo real + badge não-lida; grupo do setor recebe; mobile viewport → thread tela cheia sem BottomNav, voltar volta pra lista.
- `tsc`/`jest`/E2E verdes → build + deploy no domínio.

## Riscos
- **Colisão de rota** `chat.$ticketId` vs `chat.$conversationId`: verificar uso da antiga antes; se viva, usar segmento distinto.
- **Provisionamento lazy do grupo:** garantir idempotência (não criar 2 grupos por setor em corrida) — `findFirst`+create dentro de transação ou unique parcial por (`type`,`sector`).
- **Salas `user:<id>`:** confirmar que o socket está autenticado no connect (já está, via cookie) antes de juntar a sala.
- **Escopo:** absorve a feature "Equipe" recém-criada — remover com cuidado pra não quebrar imports.
```
