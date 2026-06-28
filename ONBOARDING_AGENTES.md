# Onboarding de Agentes — criação de usuário + envio de login (email/WhatsApp)

> Guia do **novo sistema** de onboarding. Última atualização: 2026-06-10.
> Status: ✅ implementado e verificado E2E (23 testes unitários + smoke ao vivo).

Permite ao **admin** criar um agente **sem definir senha**. O sistema gera um
**link de ativação de uso único (validade 1h)** e o envia por **email (sempre)** e
por **WhatsApp (se houver telefone)**. O agente abre o link e define a própria senha.

---

## Fluxo

```
Admin → POST /api/users  (name, email, [phoneNumber], [role], [sector])  sem password
   │
   ├─ UsersService.createLocal
   │     • valida email único
   │     • cria User com senha aleatória inutilizável + activatedAt = null
   │     └─ UserOnboardingService.generateAndSend   (best-effort)
   │           • invalida tokens não usados anteriores
   │           • gera token cru (32 bytes hex); persiste só o sha256
   │           • monta link: {APP_PUBLIC_URL}/set-password?token=<cru>
   │           • envia email  (MailService.sendAgentWelcome)   ── sempre
   │           └ envia WhatsApp (BaileysService.sendText)      ── se phoneNumber
   │
Agente → abre o link → página /set-password (frontend)
   │
   ├─ GET  /api/auth/activation/:token   → valida SEM consumir → { name, email }
   └─ POST /api/auth/activation/:token   { password }
         • revalida token (race entre GET e POST)
         • seta password (bcrypt) + activatedAt numa transação
         • marca token.usedAt  → uso único garantido
   │
Agente → POST /api/auth/login (email + senha) → cookie JWT SSO
```

## Garantias de segurança

- **Token cru nunca é persistido** — só o `sha256` (`hashToken`). Vazamento do banco não revela links.
- **Uso único**: após `POST`, `usedAt` é setado; replay → `410 Gone`.
- **Expira em 1h** (`ACTIVATION_TTL_MS`). Expirado/inexistente → `410 Gone`.
- **Senha**: mínimo 8, máximo 128 chars (`SetPasswordDto`).
- **Email/WhatsApp são best-effort**: falha de envio **não** falha a criação do usuário —
  apenas loga `warn`. Admin reenvia via `POST /api/users/:id/resend-activation`.

## Endpoints

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| POST | `/api/users` | ADMIN | Cria agente. Sem `password` ⇒ dispara onboarding. |
| POST | `/api/users/:id/resend-activation` | ADMIN | Reenvia link (409 se já ativado). |
| GET | `/api/auth/activation/:token` | Público | Valida token sem consumir. |
| POST | `/api/auth/activation/:token` | Público | Define senha e consome o token. |

## Configuração obrigatória

| Var | Para quê | Exemplo |
|-----|----------|---------|
| `APP_PUBLIC_URL` | **Base do link de ativação.** Sem ela, o link cai no 1º item de `FRONTEND_URL` (`http://localhost`) e quebra para o agente. | `https://ti.helpdeskmsm.com.br` (prod) · `http://localhost:5173` (dev) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Envio real de email. Sem isto, `MailService` entra em **modo log-only** (DRY-RUN, não envia). | `smtp.hostinger.com` |
| `SMTP_PORT` / `SMTP_SECURE` / `SMTP_FROM` | Porta/SSL/remetente. | `465` / `true` / `Helpdesk MSM <...>` |
| WhatsApp bot pareado | Envio por WhatsApp (`GET /api/whatsapp/qr`). Bot desconectado ⇒ só email. | — |

> ⚠️ `APP_PUBLIC_URL` precisa ser **repassada ao container** no `docker-compose*.yml`
> (bloco `environment`), não basta estar no `.env`.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| [backend/src/presentation/controllers/users/users.service.ts](backend/src/presentation/controllers/users/users.service.ts) | `createLocal`, `resendActivation` |
| [backend/src/presentation/controllers/onboarding/user-onboarding.service.ts](backend/src/presentation/controllers/onboarding/user-onboarding.service.ts) | gera token + envia email/WhatsApp |
| [backend/src/infrastructure/mail/mail.service.ts](backend/src/infrastructure/mail/mail.service.ts) | SMTP (nodemailer) + template de boas-vindas |
| [backend/src/presentation/controllers/auth/auth.service.ts](backend/src/presentation/controllers/auth/auth.service.ts) | `validateActivationToken`, `activateUser` |
| [backend/src/presentation/controllers/auth/dto/activation.dto.ts](backend/src/presentation/controllers/auth/dto/activation.dto.ts) | `SetPasswordDto` |
| [Frontend-chatbot/src/routes/set-password.tsx](Frontend-chatbot/src/routes/set-password.tsx) | página de definição de senha |
| `model UserActivationToken` em [backend/prisma/schema.prisma](backend/prisma/schema.prisma) | token (hash, expiresAt, usedAt) |

## Como testar (smoke E2E)

```bash
# 1. cria user pendente + token (token cru → sha256) direto no banco
RAW=$(openssl rand -hex 32); HASH=$(printf "%s" "$RAW" | openssl dgst -sha256 | awk '{print $2}')
# ...INSERT user (activatedAt=NULL) + user_activation_tokens (tokenHash=$HASH, expiresAt=+1h)

curl "http://localhost:3000/api/auth/activation/$RAW"                 # → {name,email}
curl -X POST "http://localhost:3000/api/auth/activation/$RAW" \
     -H 'Content-Type: application/json' -d '{"password":"SenhaForte123"}'  # → {ok:true}
curl -X POST "http://localhost:3000/api/auth/login" \
     -H 'Content-Type: application/json' \
     -d '{"email":"<email>","password":"SenhaForte123"}'              # → 201 + cookie JWT
```
