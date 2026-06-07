# Design — Onboarding de Agente com Ativação por Link (Email + WhatsApp)

> Data: 2026-06-07 · Branch: `feature/chatbot-upgrade`
> Status: **aprovado para implementação** (Abordagem A)

## 1. Contexto e objetivo

Hoje a criação de usuário no backend **não envia nenhuma comunicação** ao agente
(ver `users.service.createLocal`, `admin.service.createUser`, `auth.service.register`).
A expectativa do produto é que, ao criar um agente, ele receba **boas-vindas + acesso**
por **dois canais**: **email** e **mensagem do bot WhatsApp**.

Por segurança, **não trafegamos senha**. O agente recebe um **link de ativação
tokenizado** e define a própria senha. Decisões tomadas no brainstorming:

| Tema | Decisão |
|------|---------|
| Credenciais | **Link para definir senha** (não envia senha em texto) |
| Telefone | **Opcional**: email sempre; WhatsApp só se houver telefone |
| Frontend | **Sim** — implementar a página `/set-password` no `Frontend-chatbot` |
| Validade do token | **1 hora**, **uso único** (invalidado ao definir a senha com sucesso) |
| Reenvio | **Admin pode reenviar** (gera novo token, invalida os anteriores) |
| Storage do token | **Tabela Prisma** (Abordagem A) — auditável, suporta "pendente" e reenvio |

### Semântica de "uso único" (importante)
O fluxo tem **dois acessos** ao token:
- **GET** (carregar a página): apenas **valida** o token — **não** consome.
- **POST** (gravar a senha): **consome** o token (`usedAt`) ao definir a senha com sucesso.

Consumir no GET quebraria o fluxo (refresh/prefetch do navegador). Portanto
"uso único" = invalidado ao **definir a senha**, não ao abrir a página.

## 2. Arquitetura (visão geral)

```
Admin cria agente (POST /api/users)
        │
        ▼
users.service.createLocal ──► UserOnboardingService.generateAndSend(user)
        │                            │
        │                            ├─ gera token (cru + hash), invalida anteriores, persiste (TTL 1h)
        │                            ├─ monta link ${APP_PUBLIC_URL}/set-password?token=CRU
        │                            ├─ MailService.sendAgentWelcome(...)        (sempre, best-effort)
        │                            └─ BaileysService.sendText(jid, msg)        (se phone + bot on, best-effort)
        ▼
   usuário criado (activatedAt = null → "ativação pendente")

Agente abre o link ──► GET  /api/auth/activation/:token   (valida, mostra nome/email)
                  └──► POST /api/auth/activation/:token   (define senha, consome token, activatedAt = now)
                          │
                          ▼
                   redireciona p/ /login → agente entra normalmente
```

## 3. Modelo de dados (1 migration Prisma)

### 3.1 Novo model `UserActivationToken`
```prisma
model UserActivationToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique          // sha256 do token cru; o cru NUNCA é persistido
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@map("user_activation_tokens")
}
```

### 3.2 Alteração no model `User`
- Adicionar `activatedAt DateTime?` — `null` = ativação pendente (badge no admin).
- Adicionar a relação inversa `activationTokens UserActivationToken[]`.

### 3.3 Backfill na migration
- Usuários **existentes** (e qualquer criado com senha definida diretamente) recebem
  `activatedAt = now()` no momento da migration, para não aparecerem como "pendentes".

## 4. Backend

### 4.1 `MailService` (novo, injetável) — refactor do email
- **Extrair** a lógica de transporter/nodemailer que hoje vive em
  `notifications.controller.ts` para um serviço injetável reutilizável.
- Localização sugerida: `src/infrastructure/mail/mail.service.ts` + `mail.module.ts` (exporta `MailService`).
- Responsabilidades:
  - `bootstrapTransporter()` (mesma lógica/env atuais: `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`; log-only se não configurado).
  - `sendMail({ to, subject, text, html })` — retorno `{ transport, messageId? }`; nunca lança em modo log-only.
  - `sendAgentWelcome({ to, name, link })` — monta assunto/HTML/text de boas-vindas (PT-BR) com o link e aviso de validade (1h).
- `NotificationsController` passa a **delegar** ao `MailService` (sem duplicar transporter). Comportamento e contrato do `POST /notifications/email` permanecem iguais.

### 4.2 `UserOnboardingService` (novo, injetável)
- Localização: `src/presentation/controllers/users/user-onboarding.service.ts` (ou em `infrastructure/`), exportado pelo módulo que o usa.
- Dependências: `PrismaService`, `MailService`, `BaileysService` (do `WhatsAppModule`, já exportado), `ConfigService`.
- Métodos:
  - `generateAndSend(user: { id; name; email; phoneNumber? }): Promise<void>`
    1. Invalida tokens não usados do usuário (`updateMany usedAt=now` ou delete).
    2. Gera `raw = crypto.randomBytes(32).toString('hex')`; `hash = sha256(raw)`.
    3. Persiste `UserActivationToken { userId, tokenHash: hash, expiresAt: now()+1h }`.
    4. `link = ${APP_PUBLIC_URL}/set-password?token=${raw}`.
    5. `await safe(() => mail.sendAgentWelcome(...))` — best-effort (try/catch + logger.warn).
    6. Se `phoneNumber` e `baileys` conectado: `await safe(() => baileys.sendText(jid, msg))` — best-effort.
       - `jid = onlyDigits(phoneNumber) + '@s.whatsapp.net'`.
       - Mensagem PT-BR curta com o link e validade 1h.
  - Não lança se um canal falhar; loga. (Cobertura via reenvio do admin.)
- **Resolução de dependência circular:** `UsersModule`/`AdminModule` precisam importar `WhatsAppModule` (que importa `ServicesModule`, etc.). Se surgir ciclo, usar `forwardRef`. Avaliar na implementação; preferir colocar `UserOnboardingService` num módulo dedicado (`OnboardingModule`) que importa `WhatsAppModule` + `MailModule` + `PrismaModule` e é importado por `UsersModule`/`AdminModule`.

### 4.3 Mudança nos fluxos de criação
- `users.service.createLocal` e `admin.service.createUser`:
  - DTO/body passam a aceitar **`phoneNumber?`** (string, opcional).
  - **`password` vira opcional.**
  - Sem senha → criar usuário com **hash aleatório inutilizável**
    (`bcrypt.hash(randomBytes(32).hex, 12)`), `activatedAt = null`, persistir `phoneNumber`,
    e então chamar `onboarding.generateAndSend(user)`.
  - Com senha (retrocompat) → comportamento atual + `activatedAt = now()` (sem onboarding).
- `users.controller` `POST /users`:
  - Remover a obrigatoriedade de `password` (hoje lança `BadRequestException` se faltar).
  - Aceitar `phoneNumber`.
  - Continua exigindo `name` e `email`.

### 4.4 Endpoints

**Públicos** (no `AuthController`, **sem** guard JWT — mesmo padrão do `login`; com `@Throttle`):
- `GET /api/auth/activation/:token`
  - Valida: token existe (por hash), `usedAt == null`, `expiresAt > now`.
  - 200 → `{ name, email }` (do usuário) para a página renderizar.
  - 410 Gone → token expirado/usado; 404/400 → inválido. Mensagens genéricas em PT-BR.
- `POST /api/auth/activation/:token`
  - Body `{ password: string }` com validação (`class-validator`): min 8, etc. (alinhar com regra existente, se houver).
  - Revalida o token (existe/não usado/não expirado), grava `user.password = bcrypt.hash(password,12)`,
    `user.activatedAt = now()`, `token.usedAt = now()` (idealmente numa transação).
  - 200 → `{ ok: true }`. 410/400 em token inválido.

**Admin** (no `UsersController`, com os guards existentes do controller — JWT + ADMIN):
- `POST /api/users/:id/resend-activation`
  - Carrega o usuário; se `activatedAt != null` → 409 (já ativado) ou 200 idempotente (decidir: **409** com mensagem clara).
  - Chama `onboarding.generateAndSend(user)` (gera novo token, invalida anteriores, reenvia).
  - 200 → `{ ok: true }`.

### 4.5 Conteúdo das mensagens (PT-BR)

**Email** (`sendAgentWelcome`):
- Assunto: `Bem-vindo(a) ao Helpdesk MSM — defina sua senha`
- Corpo (HTML + text): saudação com `name`, informa o **login (email)**, botão/link
  "Definir minha senha" apontando para `link`, aviso "o link expira em 1 hora".

**WhatsApp** (texto):
```
Olá, {name}! 👋
Sua conta no Helpdesk MSM foi criada.
Defina sua senha de acesso (link válido por 1 hora):
{link}
```

### 4.6 Variável de ambiente nova
- `APP_PUBLIC_URL` — URL pública base do frontend para montar o link
  (ex.: `https://helpdeskmsm.com.br`). Fallback: primeiro item de `FRONTEND_URL`.
- Adicionar a `.env.example` e `src/config/env.validation.ts` (opcional, com default dev `http://localhost:8080`).

## 5. Frontend (`Frontend-chatbot`)

- Nova rota **pública** (file-based TanStack Router): `src/routes/set-password.tsx`
  (fora do grupo `_authed`).
- Lê `token` do search param (validar com schema do TanStack Router).
- **Ao montar**: `GET /api/auth/activation/:token` (via `src/lib/api.ts`).
  - Sucesso → exibe nome/email e o formulário.
  - Erro (410/400) → estado amigável: "Link inválido ou expirado. Peça ao admin para reenviar."
- **Formulário**: `nova senha` + `confirmar senha`, validação Zod (min 8, igualdade),
  alinhada à regra do backend.
- **Submit**: `POST /api/auth/activation/:token` → sucesso → `navigate('/login')` + toast de sucesso.
- Sem necessidade de autenticação. Reaproveitar estilo/components da tela de login.

## 6. Segurança
- Persistir **apenas o hash** (sha256) do token; o token cru só existe no link enviado.
- **Uso único** (`usedAt`) + **expiração 1h** (`expiresAt`).
- Senha **nunca** trafega; usuário define a própria.
- Usuário criado com **hash aleatório inutilizável** até ativar (login falha até definir senha).
- `@Throttle` nos endpoints públicos de ativação.
- Erros genéricos (não revelar se email/usuário existe além do necessário).
- Não logar token cru/link em nível acima de `debug`.

## 7. Tratamento de erros (best-effort)
- A **criação do usuário nunca falha** por erro de envio (email/WhatsApp). Falhas são
  logadas (`logger.warn`) e cobertas pelo **reenvio** do admin.
- SMTP não configurado → modo log-only (já existe), criação segue normal.
- Bot WhatsApp desconectado/sem telefone → pula o canal WhatsApp silenciosamente (log).

## 8. Testes
- **Unitários (Jest, backend):**
  - Geração/hash/validação de token; expiração; uso único (POST consome, GET não).
  - `UserOnboardingService`: chama mail e whatsapp; best-effort (continua se um canal lança).
  - Ativação: define hash de senha, marca `usedAt` e `activatedAt`.
  - `createLocal` sem senha → cria pendente + chama onboarding; com senha → ativado, sem onboarding.
  - Atualizar `tickets.service.spec`-style: garantir mocks de novas deps onde necessário.
- **Manual/E2E:**
  - Criar agente com telefone → email (ou log SMTP) + WhatsApp (se bot pareado) chegam.
  - Criar agente sem telefone → só email.
  - Abrir link → definir senha → login funciona.
  - Token expirado/usado → página mostra erro.
  - Reenvio do admin → novo link funciona, link antigo invalidado.

## 9. Fora de escopo (YAGNI)
- Reset de senha self-service para usuários já ativados (já existe `resetPassword` admin).
- Reenvio automático/agendado ao expirar (só reenvio manual do admin).
- Templates de email configuráveis por UI.
- Notificação por SMS ou outros canais.

## 10. Arquivos afetados (resumo)
**Backend (novos):** `infrastructure/mail/{mail.service.ts,mail.module.ts}`,
`.../onboarding/{user-onboarding.service.ts,onboarding.module.ts}`,
DTO de ativação, migration Prisma.
**Backend (alterados):** `prisma/schema.prisma`, `users.service.ts`, `users.controller.ts`,
`admin.service.ts` (+controller), `auth.controller.ts` (endpoints de ativação),
`auth.service.ts` (lógica de validar token/ativar), `notifications.controller.ts` (delegar ao MailService),
`.env.example`, `env.validation.ts`, `users.module.ts`/`admin.module.ts` (imports).
**Frontend (novo):** `src/routes/set-password.tsx`.
```
```
