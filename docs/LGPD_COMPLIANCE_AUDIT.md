# Auditoria LGPD — Helpdesk MSM

> **Status (2026-05-05):** 🟡 **PARCIAL** — C1–C7 resolvidos (AuditLog, data-export, erasure, incident response). A1–A9 + M1–M6 pendentes. Projeto ainda requer DPO designado, DPAs e PIA.
> **Risco:** Multa até 2% do faturamento (R$ 50M cap por infração) + ações civis + danos reputacionais.
> **Para:** tech lead, DPO designado, MiniMax (executor das remediações)
> **Última atualização:** 2026-05-05

---

## 📋 Sumário executivo

| Categoria | Conformidade | Severidade dos gaps |
|---|---|---|
| **Segurança técnica (Art. 46)** | 🟡 Parcial | 0 críticos ✅ · 4 altos pendentes |
| **Direitos dos titulares (Art. 18)** | 🟡 Parcial | 0 críticos ✅ · 2 altos pendentes |
| **Governança (Art. 41-49)** | 🔴 Sem documentação | DPO não designado · sem PIA · sem DPAs |
| **Bases legais (Art. 7º)** | 🟡 Implícitas | Sem registros de consentimento explícito |
| **Princípios (Art. 6º)** | 🟡 Parcial | Falta minimização e transparência |

**Total de itens críticos:** 7 → **0** (C1–C7 resolvidos 2026-05-05)
**Total de itens altos:** 9 (A1–A9 pendentes)
**Total de itens médios:** 6 (M1–M6 pendentes)
**Estimativa de remediação:** ~30-40h de engenharia restantes + ~16h de jurídico/governança

---

## 🗂️ Inventário de dados pessoais tratados

Mapeamento dos campos com PII no `schema.prisma`:

| Tabela | Campo | Tipo de dado | Origem | Base legal sugerida |
|---|---|---|---|---|
| `users` | `name`, `email`, `password` | Identificação + autenticação | Cadastro de funcionário | Execução de contrato (Art. 7º V) |
| `users` | `phoneNumber` | Contato | Cadastro | Execução de contrato |
| `tickets` | `customerName`, `phoneNumber` | Identificação cliente | WhatsApp/web | Legítimo interesse (Art. 7º IX) — atendimento |
| `tickets` | `description`, `solution`, `notes` | Conteúdo livre (pode ter PII) | Cliente/técnico | Legítimo interesse |
| `messages` | `content`, `mediaUrl` | Conversa cliente↔técnico | Chat web/WhatsApp | Legítimo interesse |
| `messages` | `senderId`, `waMessageId` | Vínculo identificação | Sistema | Execução de contrato |
| `email_ticket_mappings` | `email` | E-mail do solicitante | Email→ticket | Legítimo interesse |
| `whatsapp_contacts` | `phoneNumber`, `name`, `email`, `customAttributes` | Contato + custom (pode ter cargo, ramal) | WhatsApp | Legítimo interesse |
| `attachments` (uploads) | `filename`, conteúdo binário | Anexos de tickets/chat (pode ter foto de pessoas, dados sensíveis) | Cliente/técnico | Legítimo interesse |
| `bot_sessions` | Conversa do Hermes (Redis backup) | Estado conversacional | Cliente | Legítimo interesse |

⚠️ **Categorias especiais (Art. 11):** se anexos contiverem **foto de identidade**, **atestado médico**, **dado biométrico** ou **menores**, requerem consentimento específico — hoje **não há mecanismo de bloqueio**.

---

## 🔴 Itens CRÍTICOS (corrigir em ≤ 7 dias)

### C1. `/uploads/messages/*` é público — sem autenticação ✅ (corrigido 2026-05-05)
[`tickets.controller.ts`](backend/src/presentation/controllers/tickets/tickets.controller.ts) — `serveAttachment` agora usa `HermesApiKeyGuard`. Mídia de chat (`/uploads/attachments/`) protegida.

### C2. `JWT_SECRET` tem fallback `'secret'` em 3 arquivos ✅ (corrigido 2026-05-04)
Fallacks removidos de `auth.module.ts`, `jwt.strategy.ts`, `team-chat.module.ts`.

### C3. Sem AuditLog (Art. 37 — registro de operações) ✅ (corrigido 2026-05-05)
[`AuditLog` model](../backend/prisma/schema.prisma) criado com campos: `userId`, `userEmail`, `action`, `resource`, `resourceId`, `method`, `path`, `ipAddress`, `userAgent`, `statusCode`, `metadata`, `createdAt`.
[`AuditInterceptor`](../backend/src/common/interceptors/audit.interceptor.ts) registrado globalmente em `app.module.ts`. [`AuditService`](../backend/src/common/audit/audit.service.ts) com método `log()` e `findAll()`.
⚠️ Requer `prisma db push` ou migration para criar a tabela.

### C4. Senha DEV hardcoded no source-code do frontend ✅ (não existia)
O `AuthContext.tsx` atual não contém `devLogin` nem senha hardcoded. O `login` atual usa `authService.login()` normalmente via backend.

### C5. Sem endpoint de exportação de dados (Art. 18 II — direito de acesso) ✅ (corrigido 2026-05-05)
[`GET /api/auth/me/data-export`](../backend/src/presentation/controllers/auth/auth.controller.ts) — retorna JSON com user, tickets, messages, csatResponses e pushSubscriptions do titular. Implementado em `auth.service.ts:dataExport()`.

### C6. Sem endpoint de erasure / direito ao esquecimento (Art. 18 IX) ✅ (corrigido 2026-05-05)
[`DELETE /api/auth/me`](../backend/src/presentation/controllers/auth/auth.controller.ts) — pseudonimiza `name='[ANONIMIZADO-<id>]'`, `email='deleted_<anon>_@anon.local'`, limpa `phoneNumber`, desativa usuário. Implementado em `auth.service.ts:eraseAccount()`.

### C7. Sem comunicação de incidente (Art. 48) ✅ (corrigido 2026-05-05)
[`docs/INCIDENT_RESPONSE.md`](../docs/INCIDENT_RESPONSE.md) criado com fluxo completo: detecção → contenção → notificação ANPD (72h) → comunicação titulares → erradicação → post-mortem. Template de comunicação a titulares incluso.

---

## 🟠 Itens ALTOS (corrigir em ≤ 30 dias)

### A1. Sem soft delete em `User` / `Ticket` / `Message`
DELETE físico viola "necessidade de comprovação de tratamento legítimo" (Art. 16 III).
**Fix:** adicionar `deletedAt DateTime?` em models críticos + middleware Prisma global filtrando `deletedAt: null` por padrão.

### A2. PII em logs do NestJS (sem redaction)
`Logger.log({ user })` provavelmente está imprimindo `email`, `phone`. Logs vão pra stdout do container, retidos pelo Docker (ou ELK em prod).
**Fix:** custom `LoggerService` que redacta campos com regex (`/email|phone|cpf|password/i`).

### A3. Sem retention policy
Mensagens, sessões de bot, anexos, AuditLog (quando criado) — nada expira.
**Fix:** cron job mensal que:
- Deleta `Message` com `createdAt < now() - 5 anos` (CDC, mas verificar com legal)
- Anonimiza `Ticket` resolvidos > 5 anos
- Deleta `BotSession` > 90 dias
- Deleta `audit_logs` > 5 anos (mantém 5 — exigência da CDC se ainda aplicável)

### A4. Sem cookie banner / consent modal no frontend
Mesmo com cookie sendo HttpOnly, **transparência** (Art. 6º VI) requer aviso explícito na primeira visita.
**Fix:** modal `<CookieConsent />` em `__root.tsx` com 3 opções: Essenciais (sempre on), Analytics (opcional), Marketing (opcional). Persiste em localStorage `lgpd_consent`.

### A5. Sem Privacy Policy / Política de Privacidade pública
URL tipo `/privacy-policy` no frontend deveria existir e estar acessível **antes** do login.
**Fix:** rota `/privacy` com texto detalhado: bases legais, finalidades, retenção, direitos do titular, contato do DPO.

### A6. Sem DPAs (Data Processing Agreements) com terceiros
APIs externas que recebem PII do projeto:
- **MiniMax** (chave em `.env:MINIMAX_API_KEY`) — recebe conteúdo de mensagens pra Captain AI
- **Anthropic** (`ANTHROPIC_API_KEY`) — idem
- **OpenRouter** (mencionado no plan) — idem
- **WhatsApp/Meta** (via Hermes/Baileys, não-oficial) — recebe TUDO

**Fix:** verificar se existe DPA assinado com cada um. Se não, ou (a) não enviar PII (truncar/anonimizar antes de chamar), ou (b) assinar DPA, ou (c) trocar por solução interna (Ollama local).

### A7. Frontend `devLog` captura erros globais com `meta` livre
[`devLog.ts`](../profile-driven-app/src/lib/devLog.ts) captura `window.onerror` + `unhandledrejection` em localStorage com até 500 entries. `meta?: unknown` aceita qualquer payload — pode ter token, email, foto base64.
**Fix:** sanitize `meta` antes de armazenar (deepClone + remoção de chaves sensíveis); limitar tamanho por entry; nunca espelhar pra backend sem opt-in.

### A8. Sem encryption at rest no Postgres
Volume Docker armazena dados em texto. Se host Linux for comprometido, banco vaza.
**Fix:** Postgres com `pg_tde` extension (em prod), ou migrar pra disk-encrypted volume (LUKS), ou app-level encryption em campos críticos (`phoneNumber`, `email` como `bytea` cifrado).

### A9. Anexos não escaneados por antivírus
`multer` aceita qualquer arquivo até 25MB. Nada bloqueia upload de malware.
**Fix:** integrar `clamav` no fluxo (Etapa B do `CHAT_IMPLEMENTATION_FOR_MINIMAX.md`).

---

## 🟡 Itens MÉDIOS (corrigir em ≤ 90 dias)

### M1. Sem Privacy Impact Assessment (PIA / RIPD)
Art. 38 — controlador "poderá ser obrigado" a elaborar Relatório de Impacto. Para sistemas de helpdesk com dados de saúde/biometria pode virar obrigatório.
**Fix:** template `RIPD_HELPDESK_MSM.md` documentando finalidade, dados, riscos, medidas de mitigação.

### M2. DPO não designado / contato no rodapé
**Fix:** no rodapé do frontend público mostrar `DPO: <nome> · <email>`. Atualizar `CLAUDE.md` apontando o responsável.

### M3. Não há mecanismo de revogação de consentimento (Art. 8º §5º)
Quando implementar A4 (cookie banner), garantir que o usuário possa desabilitar consents posteriores.

### M4. Hermes/Baileys = WhatsApp não oficial
Risco: violação dos ToS da Meta. Não é LGPD direta, mas se o canal for derrubado, dados em trânsito podem ser perdidos sem backup.
**Fix:** plano B com WhatsApp Cloud API oficial (Meta) — pago, mas com SLA contratual.

### M5. Frontend salva `user_data` no localStorage (mesmo após nossa limpeza)
[`AuthContext.tsx:updateProfile`](../profile-driven-app/src/contexts/AuthContext.tsx) ainda escreve `name`, `email`, `phone`, `avatarUrl` em `localStorage`.
**Fix:** mover pra IndexedDB com TTL ou só manter session-state in-memory.

### M6. Logs do Hermes podem conter mensagens completas do cliente
`hermes-integration/backend-tools/server.js` faz `console.log(req.body)` em alguns endpoints.
**Fix:** wrapper de logger com redaction. Mesmo padrão de A2.

---

## ✅ O que já está correto (manter e documentar)

1. **Senhas com bcrypt cost 12** ([`auth.service.ts`](../backend/src/presentation/controllers/auth/auth.service.ts)) — adequado
2. **Cookies HttpOnly + SameSite=Lax + Secure (prod)** — corrigido em sessão anterior
3. **Helmet** com CSP, HSTS, X-Frame-Options — habilitado em [`main.ts:37`](../backend/src/main.ts#L37)
4. **Rate limiting via ThrottlerModule** — habilitado em `app.module.ts`
5. **CORS allowlist específica** com `credentials: true` apenas pras 3 origens válidas
6. **TLS forçado em prod** via `Strict-Transport-Security`
7. **Roles + SectorGuard** filtrando por setor server-side (impede acesso cross-sector)
8. **Setor enum no JWT** — não confia em query param do cliente
9. **Idempotência WhatsApp** com TTL Redis (por `wa_message_id`) — minimiza retenção desnecessária

---

## 📅 Plano de remediação proposto

### Sprint 1 (semana 1-2) — Críticos
- [ ] **C1** Auth no `/uploads/messages/*` (Etapa G do handoff de chat — 4h)
- [ ] **C2** Remover fallback `'secret'` do JWT (30min)
- [ ] **C4** Trocar `msm-dev-2026` por role `DEV` no JWT + IP allowlist (3h)
- [ ] **C7** Doc `INCIDENT_RESPONSE.md` (4h, com legal)

### Sprint 2 (semana 3-4) — Críticos restantes + altos
- [ ] **C3** AuditLog model + interceptor global (8h)
- [ ] **C5** `GET /me/data-export` (6h)
- [ ] **C6** `DELETE /me` com pseudonimização (6h)
- [ ] **A1** Soft delete + middleware Prisma (4h)
- [ ] **A2** Logger com redaction (3h)

### Sprint 3 (semana 5-6) — Altos restantes
- [ ] **A3** Cron de retention policy (6h)
- [ ] **A4** Cookie banner frontend (4h)
- [ ] **A5** `/privacy` route + texto (4h legal + 1h dev)
- [ ] **A7** Sanitize `devLog.meta` (2h)
- [ ] **A9** ClamAV no upload de mídia (4h)

### Backlog (semana 7+) — Altos infra + Médios
- [ ] **A6** DPAs ou anonimização antes de APIs externas (16h + jurídico)
- [ ] **A8** Encryption at rest (depende de infra)
- [ ] **M1-M6** itens documentais e operacionais

**Total engenharia:** ~70h
**Total jurídico/governança:** ~24h
**Prazo realista:** 8-10 semanas pra conformidade plena

---

## 🚦 Checklist de aceite final

Antes de declarar conformidade:

- [ ] Todos os itens C corrigidos e validados em prod
- [ ] DPO designado e contato publicado
- [ ] Privacy Policy publicada e linkada no rodapé + login + chat
- [ ] Cookie banner implementado e testado em 3 browsers
- [ ] AuditLog gravando 100% das operações sensíveis (samples auditados)
- [ ] Endpoints `/me/data-export` e `DELETE /me` testados E2E
- [ ] Smoke test: fazer pedido de exportação como funcionário → recebe ZIP em < 15 dias (cron)
- [ ] Smoke test: pedir erasure → 30 dias depois nenhum dado pessoal vinculado ao userId
- [ ] DPAs assinados (ou Ollama-only sem APIs externas que recebem PII)
- [ ] Penetration test externo aprovado
- [ ] Treinamento de equipe (técnicos sabem o que é dado pessoal e como tratar)

---

## 📚 Referências

- Lei 13.709/2018 (LGPD): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD Guia Orientativo: https://www.gov.br/anpd/pt-br
- Schema atual: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- Plano vigente: [`IMPLEMENTATION_PLAN_V3.md`](../IMPLEMENTATION_PLAN_V3.md)
- Implementação chat (incl. Etapa G de auth no uploads): [`CHAT_IMPLEMENTATION_FOR_MINIMAX.md`](CHAT_IMPLEMENTATION_FOR_MINIMAX.md)
