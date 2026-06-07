# Onboarding de Agente (Ativação por Link) — Plano de Implementação

> **Para o worker (GLM):** Implemente tarefa a tarefa, em ordem. Cada tarefa tem passos pequenos com checkbox `- [ ]`. Commite ao fim de cada tarefa. NÃO pule testes. Após terminar tudo, o revisor humano (Claude) confere e valida.

**Goal:** Ao criar um agente, ele recebe boas-vindas + link de ativação (define a própria senha) por **email** (sempre) e **WhatsApp** (se tiver telefone), sem trafegar senha.

**Architecture:** Token de ativação (uso único, 1h) em tabela Prisma guardando só o hash. Serviço `MailService` (extraído do notifications) e `BaileysService` (WhatsApp, best-effort) orquestrados por `UserOnboardingService`. Endpoints públicos de ativação no `AuthController`; reenvio admin no `UsersController`. Página `/set-password` no frontend.

**Tech Stack:** NestJS, Prisma/PostgreSQL, nodemailer, Baileys (WhatsApp), Jest, class-validator; Frontend TanStack Router (React 19) + Zod.

**Spec de referência:** `docs/superpowers/specs/2026-06-07-agent-onboarding-design.md` — leia antes de começar.

**Como rodar testes/build (todos os comandos backend a partir de `backend/`):**
- Typecheck: `npx tsc --noEmit --incremental false`
- Testes: `npm test` (Jest) ou um arquivo: `npx jest caminho/arquivo.spec`
- ⚠️ Não rode `tsc` com `-p tsconfig.json` sem `--incremental false` (a pasta `dist/` é do root e dá EACCES).
- Migration: `docker exec helpdesk_backend_dev npx prisma migrate dev --name <nome>` (banco roda em container).

---

## File Structure (mapa de arquivos)

**Backend — criar:**
- `backend/src/infrastructure/mail/mail.service.ts` — envio de email reutilizável
- `backend/src/infrastructure/mail/mail.module.ts`
- `backend/src/infrastructure/mail/mail.service.spec.ts`
- `backend/src/presentation/controllers/onboarding/user-onboarding.service.ts` — orquestra token + email + whatsapp
- `backend/src/presentation/controllers/onboarding/onboarding.module.ts`
- `backend/src/presentation/controllers/onboarding/user-onboarding.service.spec.ts`
- `backend/src/presentation/controllers/auth/dto/activation.dto.ts` — DTO do POST de ativação

**Backend — modificar:**
- `backend/prisma/schema.prisma` — model `UserActivationToken` + `User.activatedAt`
- `backend/src/config/env.validation.ts` — `APP_PUBLIC_URL`
- `backend/src/infrastructure/services/canned-response.service.ts` — (n/a)
- `backend/src/presentation/controllers/notifications/notifications.controller.ts` — delega ao MailService
- `backend/src/presentation/controllers/users/users.service.ts` — createLocal (senha opcional, phone, onboarding)
- `backend/src/presentation/controllers/users/users.controller.ts` — DTO POST, endpoint resend
- `backend/src/presentation/controllers/users/users.module.ts` — importar OnboardingModule
- `backend/src/presentation/controllers/admin/admin.service.ts` — createUser (idem createLocal)
- `backend/src/presentation/controllers/admin/admin.module.ts` — importar OnboardingModule (se aplicável)
- `backend/src/presentation/controllers/auth/auth.controller.ts` — endpoints GET/POST activation
- `backend/src/presentation/controllers/auth/auth.service.ts` — validateActivationToken / activateUser
- `backend/src/presentation/controllers/users/users.service.spec.ts` — atualizar mocks

**Raiz — modificar:**
- `.env.example` — `APP_PUBLIC_URL`

**Frontend — criar:**
- `Frontend-chatbot/src/routes/set-password.tsx` — página pública de definição de senha

---

## Task 1: Schema Prisma — token + activatedAt

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Adicionar campo e relação no model `User`**

Localize `model User {` e adicione (junto aos outros campos):
```prisma
  activatedAt      DateTime?          // null = ativação pendente
  activationTokens UserActivationToken[]
```

- [ ] **Step 2: Adicionar o model `UserActivationToken`** (ao final do schema, antes de nenhum bloco que feche)

```prisma
model UserActivationToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@map("user_activation_tokens")
}
```

- [ ] **Step 3: Criar a migration**

Run: `docker exec helpdesk_backend_dev npx prisma migrate dev --name add_user_activation_token`
Expected: cria `prisma/migrations/<timestamp>_add_user_activation_token/` e aplica no banco.

- [ ] **Step 4: Backfill — marcar usuários existentes como ativados**

Edite o arquivo `migration.sql` recém-criado e adicione ao final:
```sql
UPDATE "users" SET "activatedAt" = NOW() WHERE "activatedAt" IS NULL;
```
Reaplique: `docker exec helpdesk_backend_dev npx prisma migrate reset --skip-seed --force` **NÃO** (apaga dados). Em vez disso rode o UPDATE manualmente:
`docker exec helpdesk_postgres psql -U helpdesk -d helpdesk -c 'UPDATE "users" SET "activatedAt"=NOW() WHERE "activatedAt" IS NULL;'`

- [ ] **Step 5: Regenerar o Prisma Client**

Run: `docker exec helpdesk_backend_dev npx prisma generate`
Expected: sucesso, tipos `UserActivationToken` disponíveis.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(db): add UserActivationToken model + User.activatedAt"
```

---

## Task 2: `MailService` — extrair envio de email

**Files:**
- Create: `backend/src/infrastructure/mail/mail.service.ts`
- Create: `backend/src/infrastructure/mail/mail.module.ts`
- Test: `backend/src/infrastructure/mail/mail.service.spec.ts`
- Modify: `backend/src/presentation/controllers/notifications/notifications.controller.ts`

- [ ] **Step 1: Escrever o teste do MailService**

`mail.service.spec.ts`:
```typescript
import { MailService } from './mail.service';

describe('MailService', () => {
  it('modo log-only quando SMTP não configurado: não lança e retorna transport log-only', async () => {
    delete process.env.SMTP_HOST;
    const svc = new MailService();
    const res = await svc.sendMail({ to: 'a@b.com', subject: 's', text: 't' });
    expect(res.transport).toBe('log-only');
  });

  it('sendAgentWelcome monta link no corpo (log-only não lança)', async () => {
    delete process.env.SMTP_HOST;
    const svc = new MailService();
    const res = await svc.sendAgentWelcome({ to: 'a@b.com', name: 'Ana', link: 'http://x/set-password?token=abc' });
    expect(res.transport).toBe('log-only');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest mail.service.spec -c package.json`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `mail.service.ts`** (porta a lógica do notifications.controller)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.bootstrap();
  }

  private bootstrap() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      this.logger.warn('SMTP não configurado — modo log-only');
      return;
    }
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = (process.env.SMTP_SECURE ?? 'true').toLowerCase() === 'true';
    this.transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    this.transporter.verify()
      .then(() => this.logger.log(`SMTP conectado ${host}:${port} (secure=${secure})`))
      .catch((e: any) => this.logger.error(`SMTP verify falhou: ${e.message}`));
  }

  async sendMail(input: SendMailInput): Promise<{ transport: string; messageId?: string }> {
    if (!this.transporter) {
      this.logger.log(`email DRY-RUN to=${input.to} subject="${input.subject.slice(0, 60)}"`);
      return { transport: 'log-only' };
    }
    const from = process.env.SMTP_FROM || `Helpdesk MSM <${process.env.SMTP_USER}>`;
    const info = await this.transporter.sendMail({ from, ...input });
    this.logger.log(`email sent to=${input.to} messageId=${info.messageId}`);
    return { transport: 'smtp', messageId: info.messageId };
  }

  async sendAgentWelcome(p: { to: string; name: string; link: string }) {
    const subject = 'Bem-vindo(a) ao Helpdesk MSM — defina sua senha';
    const text = `Olá, ${p.name}!\n\nSua conta no Helpdesk MSM foi criada.\nLogin: ${p.to}\nDefina sua senha de acesso (link válido por 1 hora):\n${p.link}\n`;
    const html = `<p>Olá, <b>${p.name}</b>!</p>
<p>Sua conta no Helpdesk MSM foi criada.</p>
<p><b>Login:</b> ${p.to}</p>
<p><a href="${p.link}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Definir minha senha</a></p>
<p>Ou copie o link (válido por 1 hora): <br>${p.link}</p>`;
    return this.sendMail({ to: p.to, subject, text, html });
  }
}
```

- [ ] **Step 4: Implementar `mail.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest mail.service.spec -c package.json`
Expected: PASS.

- [ ] **Step 6: Refatorar `NotificationsController` para delegar ao MailService**

- Importe `MailModule` no módulo do notifications (localize `notifications.module.ts`, adicione `imports: [MailModule]`).
- No controller: injete `constructor(private readonly mail: MailService) {}` e remova o transporter próprio.
- O `POST /notifications/email` passa a chamar `await this.mail.sendMail({ to: dto.to, subject: dto.subject, text: dto.text, html: dto.html })`; manter o `@HttpCode(202)` e o shape de retorno (`{ queued: true, transport, messageId }`). Em erro de SMTP, manter `HttpException(502)`.

- [ ] **Step 7: Typecheck + testes**

Run: `npx tsc --noEmit --incremental false && npm test`
Expected: 0 erros; todos os testes passam.

- [ ] **Step 8: Commit**

```bash
git add backend/src/infrastructure/mail backend/src/presentation/controllers/notifications
git commit -m "refactor(mail): extrair MailService reutilizável do notifications"
```

---

## Task 3: Env `APP_PUBLIC_URL`

**Files:**
- Modify: `backend/src/config/env.validation.ts`
- Modify: `.env.example`

- [ ] **Step 1: Adicionar ao `env.validation.ts`** (junto a `FRONTEND_URL`)

```typescript
  @IsString()
  @IsOptional()
  APP_PUBLIC_URL: string = 'http://localhost:8080';
```
(Use os mesmos decorators do arquivo; importe `IsOptional` se necessário.)

- [ ] **Step 2: Adicionar ao `.env.example`** (perto da seção PWA/URLs)

```bash
# URL pública do frontend (para montar links de ativação por email/WhatsApp)
APP_PUBLIC_URL=https://helpdeskmsm.com.br
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/env.validation.ts .env.example
git commit -m "feat(config): add APP_PUBLIC_URL para links de ativação"
```

---

## Task 4: `UserOnboardingService` + OnboardingModule

**Files:**
- Create: `backend/src/presentation/controllers/onboarding/user-onboarding.service.ts`
- Create: `backend/src/presentation/controllers/onboarding/onboarding.module.ts`
- Test: `backend/src/presentation/controllers/onboarding/user-onboarding.service.spec.ts`

- [ ] **Step 1: Escrever o teste**

`user-onboarding.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { UserOnboardingService } from './user-onboarding.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MailService } from '../../../infrastructure/mail/mail.service';
import { BaileysService } from '../../../infrastructure/whatsapp/baileys.service';
import { ConfigService } from '@nestjs/config';

describe('UserOnboardingService', () => {
  let svc: UserOnboardingService;
  const prisma = {
    userActivationToken: { updateMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
  } as any;
  const mail = { sendAgentWelcome: jest.fn().mockResolvedValue({ transport: 'log-only' }) } as any;
  const baileys = { sendText: jest.fn().mockResolvedValue('wamid') } as any;
  const config = { get: jest.fn().mockReturnValue('http://localhost:8080') } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        UserOnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: BaileysService, useValue: baileys },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    svc = mod.get(UserOnboardingService);
  });

  it('invalida tokens anteriores, cria token e envia email', async () => {
    await svc.generateAndSend({ id: 'u1', name: 'Ana', email: 'a@b.com' });
    expect(prisma.userActivationToken.updateMany).toHaveBeenCalled();
    expect(prisma.userActivationToken.create).toHaveBeenCalled();
    expect(mail.sendAgentWelcome).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com', name: 'Ana' }));
  });

  it('envia WhatsApp quando há telefone e bot conectado', async () => {
    await svc.generateAndSend({ id: 'u1', name: 'Ana', email: 'a@b.com', phoneNumber: '5569999998888' });
    expect(baileys.sendText).toHaveBeenCalledWith('5569999998888@s.whatsapp.net', expect.stringContaining('http'));
  });

  it('best-effort: se email lança, não propaga e ainda tenta whatsapp', async () => {
    mail.sendAgentWelcome.mockRejectedValueOnce(new Error('smtp down'));
    await expect(svc.generateAndSend({ id: 'u1', name: 'Ana', email: 'a@b.com', phoneNumber: '5569999998888' })).resolves.toBeUndefined();
    expect(baileys.sendText).toHaveBeenCalled();
  });
});
```

> ℹ️ `BaileysService.sendText(jid, text)` **já verifica a conexão internamente** e retorna `null` (sem lançar) se o bot estiver desconectado. Portanto NÃO é preciso checar `isConnected` no onboarding — basta chamar `sendText` dentro de try/catch.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest user-onboarding.service.spec -c package.json`
Expected: FAIL.

- [ ] **Step 3: Implementar `user-onboarding.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MailService } from '../../../infrastructure/mail/mail.service';
import { BaileysService } from '../../../infrastructure/whatsapp/baileys.service';

export const ACTIVATION_TTL_MS = 60 * 60 * 1000; // 1h

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class UserOnboardingService {
  private readonly logger = new Logger('UserOnboarding');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly baileys: BaileysService,
    private readonly config: ConfigService,
  ) {}

  async generateAndSend(user: { id: string; name: string; email: string; phoneNumber?: string | null }): Promise<void> {
    // 1. invalida tokens anteriores não usados
    await this.prisma.userActivationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    // 2. gera token
    const raw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
    await this.prisma.userActivationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
    // 3. link
    const base = (this.config.get<string>('APP_PUBLIC_URL') || (process.env.FRONTEND_URL || '').split(',')[0] || 'http://localhost:8080').replace(/\/$/, '');
    const link = `${base}/set-password?token=${raw}`;
    // 4. email (best-effort)
    try {
      await this.mail.sendAgentWelcome({ to: user.email, name: user.name, link });
    } catch (e: any) {
      this.logger.warn(`Falha ao enviar email de ativação para ${user.email}: ${e.message}`);
    }
    // 5. whatsapp (best-effort; sendText retorna null se o bot estiver desconectado)
    if (user.phoneNumber) {
      try {
        const digits = user.phoneNumber.replace(/\D/g, '');
        const jid = `${digits}@s.whatsapp.net`;
        const msg = `Olá, ${user.name}! 👋\nSua conta no Helpdesk MSM foi criada.\nDefina sua senha de acesso (link válido por 1 hora):\n${link}`;
        const wamid = await this.baileys.sendText(jid, msg);
        if (!wamid) this.logger.warn('WhatsApp não enviado (bot desconectado?)');
      } catch (e: any) {
        this.logger.warn(`Falha ao enviar WhatsApp de ativação: ${e.message}`);
      }
    }
  }
}
```

- [ ] **Step 4: Implementar `onboarding.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';
import { MailModule } from '../../../infrastructure/mail/mail.module';
import { WhatsAppModule } from '../../../infrastructure/whatsapp/whatsapp.module';
import { UserOnboardingService } from './user-onboarding.service';

@Module({
  imports: [ConfigModule, PrismaModule, MailModule, WhatsAppModule],
  providers: [UserOnboardingService],
  exports: [UserOnboardingService],
})
export class OnboardingModule {}
```

> ⚠️ Se importar `WhatsAppModule` causar ciclo de dependência, use `forwardRef(() => WhatsAppModule)` aqui e, se necessário, no `WhatsAppModule`. Confirme que `WhatsAppModule` exporta `BaileysService` (ele exporta).

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest user-onboarding.service.spec -c package.json`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/presentation/controllers/onboarding
git commit -m "feat(onboarding): UserOnboardingService (token + email + whatsapp best-effort)"
```

---

## Task 5: Integrar onboarding na criação de usuário

**Files:**
- Modify: `backend/src/presentation/controllers/users/users.service.ts`
- Modify: `backend/src/presentation/controllers/users/users.controller.ts`
- Modify: `backend/src/presentation/controllers/users/users.module.ts`
- Modify: `backend/src/presentation/controllers/users/users.service.spec.ts`
- Modify: `backend/src/presentation/controllers/admin/admin.service.ts` (+ admin.module.ts)

- [ ] **Step 1: Atualizar `createLocal` em `users.service.ts`**

- Injete `UserOnboardingService` no constructor.
- Assinatura: aceitar `phoneNumber?: string` e `password?: string`.
- Lógica:
```typescript
async createLocal(data: {
  name: string; email: string; password?: string;
  role?: 'ADMIN' | 'AGENT' | 'ADMIN_TI' | 'ADMIN_ELECTRIC' | 'ADMIN_COMPRAS';
  sector?: 'TI' | 'ELECTRIC' | 'COMPRAS'; active?: boolean; phoneNumber?: string;
}) {
  const existing = await this.prisma.user.findFirst({ where: { email: data.email } });
  if (existing) throw new BadRequestException('E-mail já está em uso');

  const bcrypt = require('bcryptjs');
  const { randomBytes } = require('crypto');
  const usesActivation = !data.password;
  const rawPassword = data.password ?? randomBytes(32).toString('hex'); // inutilizável até ativar
  const hashedPassword = await bcrypt.hash(rawPassword, 12);

  const user = await this.prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || 'AGENT',
      sector: data.sector || 'TI',
      active: data.active ?? true,
      phoneNumber: data.phoneNumber,
      activatedAt: usesActivation ? null : new Date(),
    },
    select: { id: true, email: true, name: true, role: true, sector: true, active: true, phoneNumber: true, activatedAt: true, createdAt: true },
  });

  if (usesActivation) {
    await this.onboarding.generateAndSend({ id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber });
  }
  return user;
}
```

- [ ] **Step 2: Atualizar `users.controller.ts` (POST /users)**

- Remover a exigência de `password` (não lançar mais `BadRequestException` por falta de senha).
- Manter exigência de `name` e `email`.
- Aceitar `phoneNumber` no body e repassar.
```typescript
@Post()
@Roles('ADMIN')
async createLocalUser(
  @Body() data: { name: string; email: string; password?: string; role?: '...'; sector?: '...'; active?: boolean; phoneNumber?: string },
  @Request() req: any,
) {
  if (req.user.role !== 'ADMIN') throw new ForbiddenException('Apenas admins');
  if (!data.name || !data.email) throw new BadRequestException('Nome e e-mail são obrigatórios');
  return this.usersService.createLocal(data);
}
```

- [ ] **Step 3: `users.module.ts` — importar `OnboardingModule`**

Adicione `OnboardingModule` aos `imports`.

- [ ] **Step 4: Atualizar `users.service.spec.ts`**

Adicione um mock de `UserOnboardingService` aos providers:
```typescript
import { UserOnboardingService } from '../onboarding/user-onboarding.service';
// ...
const mockOnboarding = { generateAndSend: jest.fn().mockResolvedValue(undefined) };
// nos providers:
{ provide: UserOnboardingService, useValue: mockOnboarding },
```
E adicione 2 testes:
- `createLocal` sem senha → `prisma.user.create` chamado com `activatedAt: null` e `onboarding.generateAndSend` chamado.
- `createLocal` com senha → `activatedAt` setado (Date) e `onboarding.generateAndSend` NÃO chamado.

(Garanta que o `mockPrismaService.user.create` retorne um objeto com `id/name/email/phoneNumber`.)

- [ ] **Step 5: Replicar em `admin.service.ts createUser`**

Mesma lógica do createLocal (senha opcional + phoneNumber + activatedAt + onboarding). Injete `UserOnboardingService`; importe `OnboardingModule` no `admin.module.ts`.

- [ ] **Step 6: Typecheck + testes**

Run: `npx tsc --noEmit --incremental false && npm test`
Expected: 0 erros; 61+ testes passam (com os novos).

- [ ] **Step 7: Commit**

```bash
git add backend/src/presentation/controllers/users backend/src/presentation/controllers/admin
git commit -m "feat(users): criação de agente dispara onboarding por link (senha opcional + phone)"
```

---

## Task 6: Endpoints de ativação (público) no AuthController

**Files:**
- Create: `backend/src/presentation/controllers/auth/dto/activation.dto.ts`
- Modify: `backend/src/presentation/controllers/auth/auth.service.ts`
- Modify: `backend/src/presentation/controllers/auth/auth.controller.ts`
- Modify: `backend/src/presentation/controllers/auth/auth.module.ts` (importar PrismaModule/MailModule se necessário)
- Test: `backend/src/presentation/controllers/auth/auth.service.spec.ts` (criar se não existir)

- [ ] **Step 1: DTO `activation.dto.ts`**

```typescript
import { IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres' })
  password!: string;
}
```

- [ ] **Step 2: Métodos em `auth.service.ts`**

Use `hashToken` de `user-onboarding.service.ts` (exporte-o de lá; já está exportado).
```typescript
import { hashToken } from '../onboarding/user-onboarding.service';
// ...
async validateActivationToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const token = await this.prisma.userActivationToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new GoneException('Link inválido ou expirado. Peça ao admin para reenviar.');
  }
  return { name: token.user.name, email: token.user.email };
}

async activateUser(rawToken: string, password: string) {
  const tokenHash = hashToken(rawToken);
  const token = await this.prisma.userActivationToken.findUnique({ where: { tokenHash } });
  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new GoneException('Link inválido ou expirado. Peça ao admin para reenviar.');
  }
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash(password, 12);
  await this.prisma.$transaction([
    this.prisma.user.update({ where: { id: token.userId }, data: { password: hashed, activatedAt: new Date() } }),
    this.prisma.userActivationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}
```
> Importe `GoneException` de `@nestjs/common`. Garanta que `AuthService` tenha `PrismaService` injetado (se não tiver, adicione no constructor e no módulo).

- [ ] **Step 3: Endpoints no `auth.controller.ts`** (públicos — SEM guard JWT; com Throttle)

```typescript
@Get('activation/:token')
@Throttle({ default: { ttl: 60000, limit: 10 } })
async getActivation(@Param('token') token: string) {
  return this.authService.validateActivationToken(token);
}

@Post('activation/:token')
@Throttle({ default: { ttl: 60000, limit: 10 } })
async activate(@Param('token') token: string, @Body() dto: SetPasswordDto) {
  return this.authService.activateUser(token, dto.password);
}
```
> Importe `Get`, `Param`, `Body`, `Throttle`, `SetPasswordDto`. NÃO adicione `@UseGuards(AuthGuard('jwt'))` (devem ser públicos, como o `login`).

- [ ] **Step 4: Teste do fluxo de ativação**

Crie `auth.service.spec.ts` (ou amplie) com mock de PrismaService:
- token válido → `validateActivationToken` retorna `{name,email}`.
- token usado/expirado → lança `GoneException`.
- `activateUser` chama `user.update` (password+activatedAt) e `token.update` (usedAt).

- [ ] **Step 5: Typecheck + testes**

Run: `npx tsc --noEmit --incremental false && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/presentation/controllers/auth
git commit -m "feat(auth): endpoints públicos de ativação (validar token + definir senha)"
```

---

## Task 7: Endpoint de reenvio (admin)

**Files:**
- Modify: `backend/src/presentation/controllers/users/users.controller.ts`
- Modify: `backend/src/presentation/controllers/users/users.service.ts`

- [ ] **Step 1: Método no service**

```typescript
async resendActivation(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException('Usuário não encontrado');
  if (user.activatedAt) throw new BadRequestException('Usuário já ativado');
  await this.onboarding.generateAndSend({ id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber });
  return { ok: true };
}
```

- [ ] **Step 2: Endpoint no controller**

```typescript
@Post(':id/resend-activation')
@Roles('ADMIN')
async resendActivation(@Param('id') id: string, @Request() req: any) {
  if (req.user.role !== 'ADMIN') throw new ForbiddenException('Apenas admins');
  return this.usersService.resendActivation(id);
}
```

- [ ] **Step 3: Typecheck + testes + Commit**

```bash
npx tsc --noEmit --incremental false && npm test
git add backend/src/presentation/controllers/users
git commit -m "feat(users): endpoint admin de reenvio de ativação"
```

---

## Task 8: Frontend — página `/set-password`

**Files:**
- Create: `Frontend-chatbot/src/routes/set-password.tsx`

> Rode o frontend com `cd Frontend-chatbot && bun run dev` (porta 8080). Garanta `APP_PUBLIC_URL` do backend apontando para `http://localhost:8080` em dev.

- [ ] **Step 1: Criar a rota pública** (file-based, fora de `_authed`)

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute('/set-password')({
  validateSearch: searchSchema,
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');
  const [info, setInfo] = useState<{ name: string; email: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    api.get(`/auth/activation/${token}`)
      .then((r) => { setInfo(r.data); setState('ok'); })
      .catch(() => setState('invalid'));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error('A senha deve ter ao menos 8 caracteres');
    if (password !== confirm) return toast.error('As senhas não conferem');
    setSubmitting(true);
    try {
      await api.post(`/auth/activation/${token}`, { password });
      toast.success('Senha definida! Faça login.');
      navigate({ to: '/login' });
    } catch {
      toast.error('Não foi possível definir a senha. O link pode ter expirado.');
    } finally { setSubmitting(false); }
  }

  if (state === 'loading') return <div className="min-h-screen grid place-items-center">Carregando…</div>;
  if (state === 'invalid') return (
    <div className="min-h-screen grid place-items-center text-center p-6">
      <div>
        <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
        <p className="text-muted-foreground mt-2">Peça ao administrador para reenviar o convite de ativação.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Defina sua senha</h1>
          {info && <p className="text-muted-foreground">{info.name} · {info.email}</p>}
        </div>
        <input type="password" placeholder="Nova senha" className="w-full border rounded px-3 py-2"
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" placeholder="Confirmar senha" className="w-full border rounded px-3 py-2"
               value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground rounded py-2">
          {submitting ? 'Salvando…' : 'Definir senha'}
        </button>
      </form>
    </div>
  );
}
```
> Ajuste imports (`@/lib/api`, `toast`) aos paths/libs reais do projeto. Reaproveite componentes de input/botão do design system existente (shadcn/ui) se preferir, em vez dos elementos HTML crus.

- [ ] **Step 2: Verificar build do frontend**

Run: `cd Frontend-chatbot && bun run build`
Expected: build sem erros; rota `/set-password` gerada.

- [ ] **Step 3: Commit (no repo do frontend)**

```bash
cd Frontend-chatbot
git add src/routes/set-password.tsx
git commit -m "feat(auth): página pública /set-password (ativação de agente)"
```
> Lembrete: `Frontend-chatbot` é um repo separado (gitignored no backend). Commite lá dentro.

---

## Task 9: Verificação E2E manual (checklist)

- [ ] Backend rebuild: `docker compose -f docker-compose.dev.yml up -d --force-recreate backend`; logs sem erro de DI.
- [ ] `APP_PUBLIC_URL=http://localhost:8080` no `.env`.
- [ ] Login admin (`admin@helpdesk.com`/`Admin@123`) → `POST /api/users` com `{name,email,sector,role:'AGENT'}` **sem** password → 201, `activatedAt: null`.
- [ ] Conferir log do backend: email "DRY-RUN" (ou envio SMTP) com link `/set-password?token=...`.
- [ ] Com telefone: criar agente com `phoneNumber` → se bot pareado, mensagem chega no WhatsApp.
- [ ] Abrir `http://localhost:8080/set-password?token=<raw>` → mostra nome/email → definir senha → redireciona /login.
- [ ] Login com a nova senha → sucesso; `activatedAt` preenchido no banco.
- [ ] Reusar o mesmo token → página "inválido/expirado".
- [ ] `POST /api/users/:id/resend-activation` (admin) → novo link funciona; o antigo não.
- [ ] Criar agente passando `password` direto → `activatedAt` setado, sem email/onboarding.

---

## Notas finais para o worker
- **DRY/YAGNI/TDD**: escreva o teste antes da implementação onde indicado; não adicione features fora do escopo (ver §9 da spec).
- **Best-effort nos envios**: a criação do usuário NUNCA deve falhar por erro de email/WhatsApp.
- **Segurança**: nunca persista o token cru; nunca logue o token/link acima de `debug`.
- **Commits frequentes**: um commit por tarefa concluída, com mensagem no padrão do repo.
- Ao terminar tudo, avise para o revisor (Claude) validar contra a spec e rodar os testes.
