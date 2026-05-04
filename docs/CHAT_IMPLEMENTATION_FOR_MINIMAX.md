# Implementação detalhada — Chat WhatsApp-style (Lovable → Backend)

> **Para:** MiniMax (executor)
> **Origem:** Lovable refatorou o chat de tickets do `profile-driven-app` em estilo WhatsApp (anexos de mídia, gravação de áudio, emoji, painel flutuante no desktop). O frontend foi mergeado em `feature/chatbot-upgrade` (commit `cac49ea`) e está pushado em https://github.com/Berg-2019/profile-driven-app.
> **Problema:** A UI do Lovable é puramente local — gera URLs `blob:` via `URL.createObjectURL` que **não persistem no banco e não chegam ao WhatsApp do cliente via Hermes**. Tudo que falta é a integração backend.
> **Escopo:** Conectar o frontend novo ao backend NestJS + persistência de mídia + propagação WhatsApp.
> **Tempo estimado:** 12-16h em 5 etapas sequenciais (A→E).
> **Branch backend:** `feature/chatbot-upgrade` em https://github.com/Berg-2019/Chatbot-suporte-ti
> Última atualização: 2026-05-04

---

## 📋 Sumário executivo

| Etapa | Onde | O que entrega | Tempo |
|---|---|---|---|
| **A** | Backend Prisma | Schema com `kind`/`mediaUrl`/`fileName`/`fileSize`/`duration` + migration | 1h |
| **B** | Backend NestJS | Storage de mídia (multer) + endpoint multipart `POST /chat/messages/:ticketId` | 4h |
| **C** | Backend | Read receipts (`MessageRead` model + endpoints) | 2h |
| **D** | Frontend | Trocar `blob:` URLs por upload real; `chatService.sendMessage` aceita `File` | 3h |
| **E** | Frontend | Limpeza: remover demos reintroduzidos, restaurar tipo `'bot'`, integrar `usePushNotifications` | 2h |
| **F** (opcional) | Hermes | Propagar mídia pra WhatsApp via Baileys | 4h |

**Total mínimo (sem WhatsApp):** ~12h. **Com Hermes/WhatsApp:** ~16h.

---

## 🗺️ Arquitetura

```
[Frontend Lovable]                [Backend NestJS]               [Hermes Agent]
   chat.$ticketId.tsx                ChatService                  helpdesk-conversation
   ├ kind:text→sendMessage(string)── POST /chat/messages          ├ recebe webhook
   ├ kind:image→pickFile─────────── multipart upload (NOVO)       ├ envia via Baileys
   ├ kind:audio→MediaRecorder────── multipart upload (NOVO)       └ idempotência Redis
   ├ kind:video→pickFile─────────── multipart upload (NOVO)
   └ kind:file→pickFile──────────── multipart upload (NOVO)
                                          │
                                          ▼
                              [Storage local /uploads/messages]
                              (dev) ou S3/R2 (prod, futuro)
                                          │
                                          ▼
                              [PostgreSQL Message]
                              + mediaUrl + fileName +
                              fileSize + duration
                                          │
                                          ▼
                              [RabbitMQ message.created]
                                          │
                                          ▼
                              [Hermes consumer envia via Baileys]
                                  (mídia: sendImageMessage,
                                   sendAudioMessage,
                                   sendDocumentMessage)
```

---

## 📊 Gap analysis backend ↔ frontend

### Frontend `chat.$ticketId.tsx` (Lovable, 640 linhas)

```ts
type MsgKind = "text" | "image" | "video" | "audio" | "file";

interface Message {
  id: string;
  kind: MsgKind;        // ← backend não tem, e enum atual não cobre 'video'
  content: string;      // text OU url da mídia
  fileName?: string;    // ← backend não tem
  duration?: number;    // ← backend não tem (audio em segundos)
  sender: "technician" | "user";  // ← backend tem 'bot' também — main perdeu
  senderName?: string;  // ← backend já entrega (após fix do `CHAT_FIX_HANDOFF.md`)
  createdAt: string;
  status?: "sent" | "read";  // ← backend não tem read receipt
}
```

**O frontend hoje:**
- `handleFile()` cria `URL.createObjectURL(file)` → URL `blob:` que **só vive enquanto a aba está aberta**
- `startRecording()` grava com `MediaRecorder`, transforma em `Blob` `audio/webm` → também blob URL
- `chatService.sendMessage(ticketId, content)` envia **só o texto** mesmo quando `kind` é `image/video/audio/file`
- Resultado: anexo aparece pra técnico durante a sessão, **soma zero** no banco; cliente WhatsApp não recebe nada

### Backend Prisma `Message` (atual)

```prisma
model Message {
  id          String       @id @default(uuid())
  ticketId    String
  content     String
  type        MessageType  @default(TEXT)  // TEXT|IMAGE|AUDIO|DOCUMENT — falta VIDEO
  direction   Direction                     // INCOMING|OUTGOING
  senderId    String?
  waMessageId String?                       // pro Hermes idempotência
  isInternal  Boolean  @default(false)
  mentions    String[] @default([])
  createdAt   DateTime @default(now())
}

enum MessageType { TEXT IMAGE AUDIO DOCUMENT }
enum Direction { INCOMING OUTGOING }
```

**Falta:** `kind: VIDEO` no enum, `mediaUrl`, `fileName`, `fileSize`, `duration`, read receipts.

---

## 🛠️ Etapa A — Schema + migration (1h)

### A.1 Adicionar campos ao `Message` model

`backend/prisma/schema.prisma`:

```prisma
enum MessageType {
  TEXT
  IMAGE
  AUDIO
  VIDEO       // ← NOVO
  DOCUMENT
}

model Message {
  id          String       @id @default(uuid())
  ticketId    String
  ticket      Ticket       @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  content     String       // sempre texto: legenda da mídia OU mensagem de texto
  type        MessageType  @default(TEXT)
  direction   Direction
  senderId    String?
  sender      User?        @relation(fields: [senderId], references: [id])
  waMessageId String?

  // === NOVO: mídia ===
  mediaUrl    String?      // path relativo (/uploads/messages/<uuid>.ext) OU URL absoluta S3
  fileName    String?      // nome original do arquivo (somente DOCUMENT/VIDEO/IMAGE)
  fileSize    Int?         // bytes (limitar a 25MB no controller)
  duration    Int?         // segundos (somente AUDIO/VIDEO)
  thumbnailUrl String?     // opcional: preview de IMAGE/VIDEO

  isInternal  Boolean      @default(false)
  mentions    String[]     @default([])
  createdAt   DateTime     @default(now())

  // === NOVO: relação com leituras ===
  reads       MessageRead[]

  @@index([ticketId])
  @@index([ticketId, createdAt(sort: Desc)])
  @@index([isInternal])
  @@map("messages")
}

// === NOVO model ===
model MessageRead {
  id        String   @id @default(uuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  readAt    DateTime @default(now())

  @@unique([messageId, userId])
  @@index([userId])
  @@map("message_reads")
}
```

Não esquecer de adicionar a relação inversa em `User`:
```prisma
model User {
  // ... existente
  messageReads MessageRead[]
}
```

### A.2 Migration

```bash
cd backend
npx prisma migrate dev --name add_message_media_and_reads
```

Conferir o SQL gerado em `prisma/migrations/<timestamp>_add_message_media_and_reads/migration.sql` antes de aplicar em prod.

### A.3 Critério de aceite

- [ ] `npx prisma generate` sem erros
- [ ] `npx prisma migrate dev` aplicado limpo no banco local
- [ ] `psql` mostra colunas novas em `messages` e tabela `message_reads` criada
- [ ] Tests unitários backend `npm run test` continuam 100% passando

---

## 🛠️ Etapa B — Storage de mídia + endpoint multipart (4h)

### B.1 Decidir storage

**Recomendação para esta sprint:** filesystem local (`/uploads/messages/`) servido por `ServeStaticModule` do NestJS.
- Simples, zero deps externas, rola em dev/stage
- Em prod, trocar pra S3/R2 numa sprint futura (sem mudar o frontend — só `mediaUrl` vira URL absoluta)

### B.2 Setup multer no NestJS

`backend/src/presentation/controllers/chat/chat.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${uuid()}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
      fileFilter: (_req, file, cb) => {
        const ok = /^(image|video|audio|application)\//.test(file.mimetype);
        cb(ok ? null : new Error('Tipo de arquivo não permitido'), ok);
      },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
```

### B.3 Servir uploads estaticamente

`backend/src/main.ts` (somar):
```ts
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

// dentro do bootstrap:
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads/',
});
```

E adicionar `uploads/` ao `.gitignore` do backend (manter `.gitkeep` dentro de `uploads/messages/`).

### B.4 Endpoint multipart

Substituir `chat.controller.ts:sendMessage` por:

```ts
import {
  Controller, Post, Get, Param, Body, Query, UseGuards, Req,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { SectorGuard } from '../../../common/guards/sector.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'), SectorGuard)
export class ChatController {
  constructor(private service: ChatService) {}

  @Get('conversations')
  async getConversations(@Req() req: any, @Query('sector') sector?: string) {
    return this.service.getConversations(sector || req.user.sector || 'TI');
  }

  @Get('messages/:ticketId')
  async getMessages(@Param('ticketId') ticketId: string, @Req() req: any) {
    return this.service.getMessages(ticketId, req.user.id);
  }

  @Post('messages/:ticketId')
  @UseInterceptors(FileInterceptor('file'))
  async sendMessage(
    @Param('ticketId') ticketId: string,
    @Body() dto: {
      content?: string;          // legenda OU texto puro
      kind?: 'text' | 'image' | 'video' | 'audio' | 'file';
      isInternal?: 'true' | 'false';   // multipart sempre vem string
      duration?: string;         // segundos pro audio
    },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    const kind = dto.kind ?? (file ? this.detectKindFromMime(file.mimetype) : 'text');

    if (kind === 'text' && !dto.content?.trim()) {
      throw new BadRequestException('Mensagem de texto vazia');
    }
    if (kind !== 'text' && !file) {
      throw new BadRequestException(`Mensagem ${kind} requer arquivo`);
    }

    return this.service.sendMessage({
      ticketId,
      content: dto.content ?? '',
      kind,
      file,
      duration: dto.duration ? parseInt(dto.duration, 10) : undefined,
      isInternal: dto.isInternal === 'true',
      senderId: req.user.id,
      senderType: 'technician',
    });
  }

  @Post('messages/:messageId/read')
  async markAsRead(@Param('messageId') messageId: string, @Req() req: any) {
    return this.service.markAsRead(messageId, req.user.id);
  }

  private detectKindFromMime(mime: string): 'image' | 'video' | 'audio' | 'file' {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'file';
  }
}
```

### B.5 Service refatorado

`chat.service.ts:sendMessage`:

```ts
const KIND_TO_TYPE: Record<string, MessageType> = {
  text: 'TEXT',
  image: 'IMAGE',
  video: 'VIDEO',
  audio: 'AUDIO',
  file: 'DOCUMENT',
};

async sendMessage(input: {
  ticketId: string;
  content: string;
  kind: 'text' | 'image' | 'video' | 'audio' | 'file';
  file?: Express.Multer.File;
  duration?: number;
  isInternal: boolean;
  senderId: string;
  senderType: 'user' | 'technician' | 'bot';
}) {
  const direction = input.senderType === 'user' ? 'INCOMING' : 'OUTGOING';
  const type = KIND_TO_TYPE[input.kind];

  const m = await this.prisma.message.create({
    data: {
      ticketId: input.ticketId,
      content: input.content,
      type,
      direction,
      senderId: input.senderId,
      isInternal: input.isInternal,
      mediaUrl: input.file ? `/uploads/messages/${input.file.filename}` : null,
      fileName: input.file?.originalname ?? null,
      fileSize: input.file?.size ?? null,
      duration: input.duration ?? null,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  // Publicar no RabbitMQ pro Hermes propagar via WhatsApp (Etapa F)
  await this.events.publish('message.created', {
    ticketId: m.ticketId,
    messageId: m.id,
    direction: m.direction,
    type: m.type,
    mediaUrl: m.mediaUrl,
    waMessageId: null,
  });

  return this.normalize(m);
}

private normalize(m: any) {
  return {
    id: m.id,
    content: m.content,
    kind: m.type.toLowerCase() as 'text'|'image'|'video'|'audio'|'document',
    mediaUrl: m.mediaUrl,
    fileName: m.fileName,
    fileSize: m.fileSize,
    duration: m.duration,
    sender: this.deriveSenderType(m),  // já existe
    senderName: m.sender?.name ?? (m.direction === 'INCOMING' ? 'Cliente' : 'Sistema'),
    isInternal: m.isInternal,
    createdAt: m.createdAt,
    status: 'sent' as const,  // Etapa C atualiza pra 'read' quando aplicável
  };
}
```

> **Nota sobre `kind`:** o frontend usa `'file'` mas o enum Prisma é `DOCUMENT`. O service traduz nos dois sentidos. Isso é proposital — `DOCUMENT` é o nome canônico do banco, `file` é o nome do bucket UI.

### B.6 Critério de aceite (Etapa B)

```bash
# Smoke test
curl -s -c /tmp/cj.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@helpdesk.com","password":"admin123"}' > /dev/null

TICKET=$(curl -s -b /tmp/cj.txt http://localhost:3000/api/tickets | jq -r '.tickets[0].id')

# Texto puro
curl -s -b /tmp/cj.txt -X POST http://localhost:3000/api/chat/messages/$TICKET \
  -F 'content=teste texto' -F 'kind=text' | jq

# Imagem
curl -s -b /tmp/cj.txt -X POST http://localhost:3000/api/chat/messages/$TICKET \
  -F 'kind=image' -F 'content=Foto do problema' \
  -F 'file=@/tmp/test.png' | jq

# Audio
curl -s -b /tmp/cj.txt -X POST http://localhost:3000/api/chat/messages/$TICKET \
  -F 'kind=audio' -F 'duration=12' \
  -F 'file=@/tmp/test.webm' | jq

# Verificar URL acessível
curl -s -o /tmp/dl.png -w "HTTP %{http_code}\n" http://localhost:3000/uploads/messages/<uuid>.png
```

Esperado: HTTP 201 nos POSTs com payload `{id, kind, mediaUrl, fileName, ...}`. GET no `mediaUrl` retorna 200 com bytes.

- [ ] Texto continua funcionando (regressão zero)
- [ ] Imagem JPG/PNG até 25MB salva e serve
- [ ] Áudio webm com `duration` persistido
- [ ] Vídeo MP4 salvo
- [ ] Documento PDF salvo com `fileName` original preservado
- [ ] Arquivo > 25MB rejeitado com 413/400 limpo (não 500)

---

## 🛠️ Etapa C — Read receipts (2h)

### C.1 Endpoint marcar como lida

Já incluído no controller acima (`POST /chat/messages/:messageId/read`).

`chat.service.ts:markAsRead`:
```ts
async markAsRead(messageId: string, userId: string) {
  await this.prisma.messageRead.upsert({
    where: { messageId_userId: { messageId, userId } },
    update: {},
    create: { messageId, userId },
  });
  return { ok: true };
}
```

### C.2 Estender `getMessages` com status

```ts
async getMessages(ticketId: string, viewerUserId: string) {
  const rows = await this.prisma.message.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      reads: { where: { userId: { not: viewerUserId } } },  // leituras de OUTROS
    },
  });

  return rows.map(m => ({
    ...this.normalize(m),
    status: this.deriveStatus(m, viewerUserId) as 'sent' | 'read',
  }));
}

private deriveStatus(m: any, viewerUserId: string): 'sent' | 'read' {
  // Se eu sou o sender, marca 'read' se algum outro usuário leu
  if (m.senderId === viewerUserId) {
    return m.reads.length > 0 ? 'read' : 'sent';
  }
  // Não sou o sender — irrelevante o badge
  return 'sent';
}
```

### C.3 Critério de aceite (Etapa C)

```bash
# Marca msg do técnico A como lida pelo cliente B
curl -s -b /tmp/cj.txt -X POST \
  http://localhost:3000/api/chat/messages/<msg-id>/read | jq
# → {"ok":true}

# Sender A pega a lista — sua msg deve ter status:'read'
curl -s -b /tmp/cj.txt http://localhost:3000/api/chat/messages/<ticket-id> | jq '.[].status'
```

- [ ] Idempotente (chamar `read` 2x não duplica)
- [ ] Sender vê `status: 'read'` quando outro user lê
- [ ] Sender vê `status: 'sent'` quando ninguém leu

---

## 🛠️ Etapa D — Frontend: integrar de verdade (3h)

### D.1 Atualizar `lib/api.ts`

Trocar `chatService.sendMessage`:

```ts
export const chatService = {
  getConversations: () => api.get("/chat/conversations"),
  getMessages: (ticketId: string) => api.get(`/chat/messages/${ticketId}`),

  sendMessage: (
    ticketId: string,
    payload: {
      content?: string;
      kind: 'text' | 'image' | 'video' | 'audio' | 'file';
      file?: File;
      duration?: number;
      isInternal?: boolean;
    },
  ) => {
    if (payload.kind === 'text') {
      // Sem file → JSON puro (mais leve, mantém compat com call sites antigos)
      return api.post(`/chat/messages/${ticketId}`, {
        content: payload.content,
        kind: 'text',
        isInternal: payload.isInternal ?? false,
      });
    }
    const fd = new FormData();
    fd.append('kind', payload.kind);
    if (payload.content) fd.append('content', payload.content);
    if (payload.file) fd.append('file', payload.file);
    if (payload.duration) fd.append('duration', String(payload.duration));
    fd.append('isInternal', String(payload.isInternal ?? false));
    return api.post(`/chat/messages/${ticketId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  markRead: (messageId: string) =>
    api.post(`/chat/messages/${messageId}/read`),
};
```

### D.2 Atualizar `chat.$ticketId.tsx:handleFile` e `stopRecording`

**Antes (Lovable, errado):**
```ts
const handleFile = (e, kind) => {
  const file = e.target.files?.[0];
  const url = URL.createObjectURL(file);  // ← blob, não persiste
  pushMessage({ kind, content: url, fileName: file.name });
};
```

**Depois:**
```ts
const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: MsgKind) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';

  // Otimista: mostra com URL local enquanto upload roda
  const tmpUrl = URL.createObjectURL(file);
  const tempId = `tmp-${Date.now()}`;
  setMessages((p) => [...p, {
    id: tempId, kind, content: tmpUrl, fileName: file.name,
    sender: 'technician', senderName: 'Você',
    createdAt: new Date().toISOString(), status: 'sent',
  }]);

  try {
    const res = await chatService.sendMessage(ticketId, { kind, file, content: file.name });
    const persisted = res.data;
    // Substitui temp pelo persistido (mediaUrl real do backend)
    setMessages((p) => p.map((m) => (m.id === tempId ? {
      ...persisted,
      content: persisted.mediaUrl ? `${API_BASE_URL}${persisted.mediaUrl}` : persisted.content,
    } : m)));
    URL.revokeObjectURL(tmpUrl);
  } catch (err) {
    setMessages((p) => p.filter((m) => m.id !== tempId));
    URL.revokeObjectURL(tmpUrl);
    toast.error(`Erro ao enviar ${kind === 'image' ? 'imagem' : kind === 'video' ? 'vídeo' : kind === 'audio' ? 'áudio' : 'arquivo'}`);
  }
};

// Mesma lógica em stopRecording — passar o Blob como File
const stopRecording = (cancel = false) => {
  if (recordTimerRef.current) {
    clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
  }
  if (mediaRecorderRef.current) {
    if (cancel) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.stop();
    } else {
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        const tmpUrl = URL.createObjectURL(blob);
        const tempId = `tmp-${Date.now()}`;
        setMessages((p) => [...p, {
          id: tempId, kind: 'audio', content: tmpUrl,
          duration: recordSeconds, sender: 'technician', senderName: 'Você',
          createdAt: new Date().toISOString(), status: 'sent',
        }]);
        try {
          const res = await chatService.sendMessage(ticketId, { kind: 'audio', file, duration: recordSeconds });
          const persisted = res.data;
          setMessages((p) => p.map((m) => (m.id === tempId ? {
            ...persisted,
            content: persisted.mediaUrl ? `${API_BASE_URL}${persisted.mediaUrl}` : '',
          } : m)));
          URL.revokeObjectURL(tmpUrl);
        } catch {
          setMessages((p) => p.filter((m) => m.id !== tempId));
          URL.revokeObjectURL(tmpUrl);
          toast.error('Erro ao enviar áudio');
        }
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }
  setIsRecording(false);
  setRecordSeconds(0);
};
```

### D.3 Importar `API_BASE_URL` em `chat.$ticketId.tsx`

`lib/api.ts`:
```ts
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://api.helpdeskmsm.com.br/api';
```

E no chat:
```ts
import { chatService, ticketService, API_BASE_URL } from '@/lib/api';
```

> Cuidado: `mediaUrl` vem do backend como path relativo `/uploads/messages/<uuid>`. O frontend precisa prefixar com a origem do backend (sem o `/api` no fim — então melhor extrair a origem):
> ```ts
> const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
> // Usar `${BACKEND_ORIGIN}${mediaUrl}` ao invés de concat direto
> ```

### D.4 Read receipt no scroll

Adicionar no `chat.$ticketId.tsx`:
```ts
useEffect(() => {
  // Ao montar, marca todas as msgs INCOMING (que não são do user atual) como lidas
  const unread = messages.filter(m => m.sender !== 'technician');
  unread.forEach(m => {
    chatService.markRead(m.id).catch(() => {});  // best-effort
  });
}, [messages.length]);
```

> Versão mais cara: `IntersectionObserver` em cada bolha. Vale a pena só se a lista for muito longa.

### D.5 Critério de aceite (Etapa D)

1. Tirar foto via 📎 → câmera → bolha aparece com thumb otimista
2. Reload → foto continua na conversa (carregada do backend, não blob)
3. Gravar áudio 5s → bolha com player + duração
4. Reload → áudio toca normalmente
5. Anexar PDF → bolha com nome do arquivo + ícone de file
6. Console **zero** `URL.createObjectURL` orfão (verificar com profiler que `revokeObjectURL` sempre roda)
7. Mensagem enviada por mim → outro técnico abre → minha bolha vira `read` (CheckCheck azul)

---

## 🛠️ Etapa E — Limpeza e regressões (2h)

### E.1 Restaurar tipo `'bot'` no sender union

[chat.$ticketId.tsx:53](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L53):
```ts
sender: "technician" | "user" | "bot";
```

E na renderização adicionar branch pra bot (estilo violeta com ícone Bot, igual estava antes do refator):
```tsx
const bgClass =
  msg.sender === "technician" ? "bg-primary text-primary-foreground rounded-br-md"
  : msg.sender === "bot" ? "bg-violet-100 text-violet-900 rounded-bl-md border border-violet-200"
  : "bg-card text-card-foreground rounded-bl-md border border-border";
```

### E.2 Remover `demoTicket()` reintroduzido

[chat.$ticketId.tsx:71-84](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L71-L84) — remover função `demoTicket()` e o `setTicket(demoTicket(ticketId))` no catch da `useEffect` em `load()`. Substituir por:
```ts
} catch {
  toast.error('Erro ao carregar chamado');
  setTicket(null);
}
```

E renderizar empty state quando `!ticket`:
```tsx
if (!ticket && !isLoading) {
  return <ErrorState onBack={onClose} />;
}
```

### E.3 Remover mensagens hardcoded

Mesmo padrão para o catch de `chatService.getMessages` ([chat.$ticketId.tsx:140-146](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx#L140-L146)):
```ts
} catch {
  setMessages([]);
  toast.error('Erro ao carregar mensagens');
}
```

### E.4 Restaurar usePushNotifications + useServiceWorkerUpdate + useOfflineTicketQueue

Esses 3 hooks foram **deletados pelo Lovable no main**. A nossa branch tinha eles (Phase 6.4). Recuperar do stash:

```bash
cd ~/Projetos/profile-driven-app
git stash show -p stash@{0} -- src/hooks/ | head -200  # confere
git checkout stash@{0} -- src/hooks/usePushNotifications.ts \
                          src/hooks/useServiceWorkerUpdate.ts \
                          src/hooks/useOfflineTicketQueue.ts
```

E re-importar onde faz sentido:
- `useServiceWorkerUpdate` em `__root.tsx:RootComponent`
- `usePushNotifications` em `settings.tsx` (toggle)
- `useOfflineTicketQueue` em `tickets.new.tsx` (catch de network error)

### E.5 Restaurar `assets.scan.tsx`

Foi deletado no main. Recuperar:
```bash
git checkout stash@{0} -- src/routes/_authed/assets.scan.tsx
git checkout stash@{0} -- public/icons/  # PWA icons
```

> **Nota:** se o user quiser **definitivamente** abandonar scanner QR e push notifications, ignorar E.4 e E.5. Mas eles fazem parte da Fase 6.4 do plano — confirmar com o tech lead antes de descartar.

### E.6 Critério de aceite (Etapa E)

- [ ] `grep -rn "demoTicket\|samples:" src/routes/_authed/` retorna 0
- [ ] Sender de bolha de bot renderiza em violeta com ícone
- [ ] `npm run typecheck` limpo
- [ ] Push notifications voltam a aparecer no toggle de settings (se E.4 aplicado)
- [ ] Scanner QR funciona em `/assets/scan` (se E.5 aplicado)

---

## 🛠️ Etapa F (opcional, +4h) — Hermes propaga mídia via WhatsApp

Esta é a parte que faz o cliente final receber a foto/áudio que o técnico mandou. Sem ela, o chat só funciona técnico↔técnico interno.

### F.1 Skill `helpdesk-conversation` consumir `message.created`

Em `hermes-integration/skills/helpdesk-conversation/handlers/`:
```js
// outgoing-handler.js (NOVO)
// Inscrição em RabbitMQ queue 'message.created' filtrando direction=OUTGOING
async function handleOutgoing(event) {
  const { ticketId, messageId, mediaUrl, type, content } = event;
  if (type === 'TEXT') {
    await whatsapp.sendTextMessage(phoneFromTicket(ticketId), content);
  } else if (type === 'IMAGE') {
    await whatsapp.sendImageMessage(phoneFromTicket(ticketId), `${BACKEND}${mediaUrl}`, content /* caption */);
  } else if (type === 'AUDIO') {
    await whatsapp.sendAudioMessage(phoneFromTicket(ticketId), `${BACKEND}${mediaUrl}`);
  } else if (type === 'VIDEO') {
    await whatsapp.sendVideoMessage(phoneFromTicket(ticketId), `${BACKEND}${mediaUrl}`, content);
  } else if (type === 'DOCUMENT') {
    await whatsapp.sendDocumentMessage(phoneFromTicket(ticketId), `${BACKEND}${mediaUrl}`, fileName);
  }

  // Atualiza waMessageId no backend (idempotência)
  await axios.patch(`${BACKEND}/chat/messages/${messageId}/wa-id`, { waMessageId: result.id });
}
```

### F.2 Endpoint backend pra atualizar `waMessageId`

```ts
@Patch('messages/:id/wa-id')
async setWaId(
  @Param('id') id: string,
  @Body('waMessageId') waMessageId: string,
) {
  await this.prisma.message.update({ where: { id }, data: { waMessageId } });
  return { ok: true };
}
```

### F.3 Critério de aceite (Etapa F)

1. Pareando WhatsApp do Hermes (já existe — `hermes whatsapp`)
2. Chat web → enviar foto pro ticket de número WhatsApp pareado
3. Cliente recebe a foto **no WhatsApp** com a legenda
4. Logs do Hermes mostram `OUTGOING type=IMAGE wa_id=<id>`
5. Idempotência: re-enviar não duplica (mesmo `messageId` no metadata da queue)

---

## 🧪 Smoke test E2E (após todas as etapas)

```bash
# Setup
cd ~/Projetos/Chatbot-suporte-ti
docker compose -f docker-compose.dev.yml up -d backend hermes hermes-tools
cd ~/Projetos/profile-driven-app
bun run dev:ti

# Browser: localhost:5173
# 1. Login admin@helpdesk.com / admin123
# 2. Abrir um ticket existente
# 3. Clicar Conversar → /chat/<id>
# 4. Header rico (nome, priority, status) ✓
# 5. Texto + emoji ✓
# 6. 📎 → Imagem da galeria → upload → bolha com thumb ✓
# 7. 📎 → Câmera → tirar foto → bolha com thumb ✓
# 8. Mic 🎤 → gravar 5s → soltar → bolha de áudio com player + duração ✓
# 9. Reload página → tudo persistido (mediaUrl carrega do backend) ✓
# 10. Console zero erros ✓
# 11. (opcional F) Cliente WhatsApp recebe ✓
```

---

## 🚨 Rollback plan

Cada etapa é reversível independentemente:

- **A (schema):** `npx prisma migrate resolve --rolled-back <migration>` + manter código velho
- **B (multer):** remover `MulterModule` import + voltar `sendMessage` body pra `{content}` puro
- **C (read receipts):** apenas não chamar `markRead` no frontend; tabela vazia não atrapalha
- **D (frontend):** `git revert <commit>` da etapa
- **E (cleanup):** opt-out

Backend Prisma: campos novos são todos opcionais (`?`), então código velho roda mesmo após migration.

---

## 📋 Tarefas paralelas que podem rodar em outra thread

Enquanto MiniMax roda A→E:

- **Equipe DevOps:** preparar bucket S3/R2 pra Etapa B em prod (não bloqueia dev)
- **QA:** redigir Playwright E2E `chat.spec.ts` cobrindo os 11 passos do smoke test
- **Designer:** ícone customizado de "audio playing" pro estado de gravação (lottie ou SVG)
- **Backend separado:** restaurar `sector.guard` import em `team-chat.controller.ts` se o import path foi corrigido (já feito em sessão anterior)

---

## ⚠️ Pegadinhas conhecidas

1. **`URL.createObjectURL` vaza memória** se não der `revokeObjectURL` — todo lugar que cria, lembrar de revogar quando substituir pela URL real
2. **CORS:** o backend precisa expor `Content-Disposition` em `exposedHeaders` se quiser que o `<a download>` funcione com `fileName` original — adicionar em `main.ts:90`
3. **Multer + `class-validator`:** `whitelist: true` global pode strippar o body multipart — usar `@Body()` cru no método ou DTO específico
4. **Tamanho de áudio webm:** ~50KB/segundo. 25MB cobre uns 8min de áudio — suficiente
5. **Permissão de microfone:** browser bloqueia em http (sem TLS) **exceto localhost**. Em prod precisa estar em https
6. **Hermes idempotência:** queue `message.created` pode ser entregue 2x — `helpdesk-conversation` precisa checar `waMessageId IS NOT NULL` antes de enviar
7. **Mobile Safari ≤ 14:** `MediaRecorder` não suporta `audio/webm`. Detectar e gravar `audio/mp4` como fallback (`MediaRecorder.isTypeSupported`)

---

## 📚 Referências

- Backend Prisma: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- Frontend chat: [`profile-driven-app/src/routes/_authed/chat.$ticketId.tsx`](../profile-driven-app/src/routes/_authed/chat.$ticketId.tsx)
- Lovable plan dump: [`profile-driven-app/.lovable/plan.md`](../profile-driven-app/.lovable/plan.md)
- Spec UI/UX prévio: [`docs/CHAT_SCREEN_SPEC.md`](CHAT_SCREEN_SPEC.md)
- Bugs anteriores resolvidos: [`docs/CHAT_FIX_HANDOFF.md`](CHAT_FIX_HANDOFF.md)
- Checklist global: [`IMPLEMENTATION_CHECKLIST.md`](../IMPLEMENTATION_CHECKLIST.md) §6.10

---

## ✅ Definition of Done

A implementação está pronta quando:

1. Todas as etapas A→E commitadas em `feature/chatbot-upgrade` (backend + frontend) com tests passando
2. Smoke test E2E manual (11 passos acima) aprovado em viewport mobile (375px) e desktop (≥1280px)
3. Lighthouse PWA score ≥ 95 mantido (não regredir)
4. Migrations aplicáveis em staging sem perda de dados (validar com snapshot do banco antes/depois)
5. Volume `uploads/` com permissão correta no docker-compose (montagem `./uploads:/app/uploads`)
6. Doc atualizado: este arquivo marcando seções `[x]`, `IMPLEMENTATION_CHECKLIST.md` §6.10 também
7. PR aberto pra `develop` (não `main` — produção) com checklist de revisão preenchido

Etapa F (Hermes) pode ser PR separado.

---

## 📝 Implementation Log — 2026-05-04

### Etapa A — Schema ✅
- [x] `VIDEO` adicionado ao enum `MessageType`
- [x] Campos `mediaUrl`, `fileName`, `fileSize`, `duration`, `thumbnailUrl` em `Message`
- [x] Model `MessageRead` criado com relação para `Message` e `User`
- [x] Migration SQL criada em `prisma/migrations/20260504170000_add_message_media_and_reads/migration.sql`
- [x] Banco sincronizado via `prisma db push` em dev (migration não pôde ser aplicada via `prisma migrate dev` devido a conflito com migration antiga do shadow database —UUID function não existe no ambiente local)

### Etapa B — Storage + Endpoint multipart ✅
- [x] `MulterModule` configurado em `chat.module.ts` com `diskStorage` em `./uploads/messages/`
- [x] Limite de 25MB, filtro MIME (image|video|audio|application)
- [x] `POST /chat/messages/:ticketId` aceita `multipart/form-data` com `FileInterceptor`
- [x] `ServeStaticModule` configurado em `main.ts` para servir `/uploads/`
- [x] `uploads/messages/.gitkeep` criado (permissão root corrigida com sudo)
- [x] Smoke test: texto ✅, imagem ✅, áudio com duration ✅

### Etapa C — Read receipts ✅
- [x] `POST /chat/messages/:messageId/read` endpoint
- [x] `chatService.markAsRead()` com upsert idempotente
- [x] `getMessages()` inclui `reads` e deriva `status: 'sent' | 'read'`
- [x] Frontend marca mensagens incoming como lidas ao carregar

### Etapa D — Frontend: upload real ✅
- [x] `lib/api.ts`: `chatService.sendMessage()` refatorado para aceitar `{content, kind, file, duration, isInternal}`
- [x] `FormData` para multipart quando há arquivo
- [x] `BACKEND_ORIGIN` e `getMediaUrl()` exportados
- [x] `markRead()` adicionado
- [x] `chat/$ticketId.tsx` rewrite completo:
  - Interface `Message` com `kind`, `mediaUrl`, `fileName`, `fileSize`, `duration`, `status`
  - `handleFileChange()` com URL temporária otimista + revoke
  - `openFilePicker()` para imagem/arquivo
  - `startRecording()` / `stopRecording()` com MediaRecorder
  - Renderização condicional: `<img>` pra image, `<audio>` pra audio, ícone+texto pra file/video
  - Badge `CheckCheck` azul para mensagens lidas

### Etapa E — Limpeza ✅
- [x] Sem `demoTicket` ou `samples:` encontrados no frontend
- [x] Tipo `bot` preservado na interface e renderização
- [x] Build frontend passa (`npm run build` → 77.82 kB chat chunk)

### Pending — thumbnails (futuro)
- `thumbnailUrl` existe no schema mas não é preenchido pelo service
- Requer sharp (Node.js) ou ffmpeg para gerar preview de image/video
- Não bloqueia funcionamento atual

### Pending — permissões uploads
- `/uploads/messages` criado com owner root (pelo container)
- `Dockerfile.dev` ajustado para criar com `chown -R node:node /app/uploads`
- Em prod considerar mapear UID 1000 ou usar volume named

### Testes
```bash
cd backend && npm run test   # 69 passed ✅
# Smoke test backend:
# POST /chat/messages/:id (text) → 201 ✅
# POST /chat/messages/:id + file (image) → 201 + mediaUrl ✅
# POST /chat/messages/:id + duration (audio) → 201 + duration ✅
# GET /chat/messages/:id → lista com campos novos ✅
```
