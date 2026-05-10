# INTEGRATION_PLAN_LOVABLE.md

> Plano de integração do frontend pós-merge Lovable (`profile-driven-app`) com o backend NestJS deste repo.
> Complementa [`IMPLEMENTATION_PLAN_V3.md`](IMPLEMENTATION_PLAN_V3.md) — não substitui.
> Criado: 2026-05-10 · Branch: `feature/chatbot-upgrade`

## Contexto

A Lovable empurrou 49 commits em `origin/main` do `profile-driven-app`, trazendo features novas **construídas 100% sobre mocks (localStorage / fallbacks `try/catch`)**. O merge foi feito favorecendo Lovable (`-X theirs`); 7 modificações locais não commitadas (integrações backend) ficaram em `stash@{0}`.

### Features novas trazidas pela Lovable

| Feature | Estado |
|---|---|
| Aba **Relatórios Técnicos** (RT-2026-XXXX, NR-10/NR-35) com fotos, anotações, assinaturas | 100% mock (localStorage) |
| `SignaturePad` (canvas → PNG base64) | UI ok, sem upload |
| `SectorSwitcher` (alternar TI/ELECTRIC/COMPRAS) | Local-only (localStorage) |
| `InstallPwaPrompt` (banner instalar PWA) | Web API real, ok |
| `dev-login` + `dev.tsx` + `dev.index.tsx` (console interno) | Senha hardcoded `msm-dev-2026` |
| `devLog` (captura console.error/warn em memória) | Tooling, ok |
| `BottomNav` por setor | UI ok |
| `LoansPanel` em assets | Mock array `mockLoans` |

### Regressões arquiteturais introduzidas

1. **PWA manifest unificado** (`/public/manifest.webmanifest`) substituiu os 3 manifests por subdomínio. **Quebra a estratégia V3** ([CLAUDE.md](CLAUDE.md): "manifest vem do host… cada subdomínio instala como PWA distinta").
2. **`__root.tsx` ficou com código morto** (linhas 36–58 referenciando `/manifests/manifest-{ti,electric,compras}.webmanifest` deletados).
3. **`AuthContext.tsx` ganhou `DEMO_USERS` hardcoded** (`ti@msm:1234`, etc.) e `devLogin("msm-dev-2026")` — bypassam o backend real.
4. **`role: "DEV"` no JWT** (frontend-only) — backend não conhece esse role.
5. **Branding "Lovable App"** ainda aparece em meta tags (`<title>`, OG tags).

### Gaps backend ↔ frontend

| Frontend espera | Backend tem? | Ação |
|---|---|---|
| `POST/GET/PATCH/DELETE /reports/technical/*` (CRUD relatórios técnicos) | ❌ Não existe | **Criar módulo** |
| `POST /reports/technical/:id/sign` (assinatura PNG) | ❌ Não existe | **Criar** |
| `POST /reports/technical/:id/media` (fotos/vídeos) | ❌ Não existe | **Criar** |
| `POST/PATCH /reports/technical/:id/annotations` | ❌ Não existe | **Criar** |
| `GET /tools/loans` (LoansPanel) | ✅ Existe | Apenas wire-up no front |
| `POST /tools/:id/loan`, `POST /tools/:id/return` | ✅ Existe | Apenas wire-up |
| `PATCH /users/me/preferences` (SectorSwitcher persist) | ❌ Não existe | **Criar (opcional)** |
| `GET /auth/me` | ✅ Existe | Já usado |
| `POST /push/subscribe` | ✅ Existe | Verificar pipeline de envio |

> **Observação importante:** o backend já expõe `/reports/tickets` e `/reports/stock` — esses são **relatórios agregados** sobre tickets/estoque, **não** são os "Relatórios Técnicos" (laudos de serviço com assinatura) que a Lovable construiu. Vou nomear o módulo novo `technical-reports/` para evitar colisão.

---

## Fase 1 — Backend: módulo Technical Reports (laudos de serviço)

**Objetivo:** prover CRUD completo + upload de mídia + assinatura digital para os relatórios técnicos da aba Relatórios.
**Estimativa:** 4–6 dias.

### 1.1 — Schema Prisma

Adicionar a `backend/prisma/schema.prisma`:

```prisma
enum TechnicalReportStatus {
  DRAFT
  SUBMITTED
  REWORK
  APPROVED
}

enum SignerRole {
  ENGINEER
  TECHNICIAN
  CLIENT
}

model TechnicalReport {
  id             String                  @id @default(cuid())
  number         String                  @unique          // RT-2026-NNNN
  sector         Sector                                    // TI/ELECTRIC/COMPRAS
  title          String
  site           String
  serviceDate    DateTime
  engineerId     String?
  technicianId   String?
  assistants     String[]                                  // nomes livres
  summary        String                  @db.Text
  execution      String                  @db.Text
  materials      String                  @db.Text
  observations   String                  @db.Text
  status         TechnicalReportStatus   @default(DRAFT)
  ticketId       String?                                   // opcional, vincula ao ticket que gerou
  createdById    String
  createdAt      DateTime                @default(now())
  updatedAt      DateTime                @updatedAt

  engineer       User?                   @relation("ReportEngineer", fields: [engineerId], references: [id])
  technician     User?                   @relation("ReportTechnician", fields: [technicianId], references: [id])
  createdBy      User                    @relation("ReportCreator", fields: [createdById], references: [id])
  ticket         Ticket?                 @relation(fields: [ticketId], references: [id])
  media          TechnicalReportMedia[]
  annotations    TechnicalReportAnnotation[]
  signatures     TechnicalReportSignature[]

  @@index([sector, status])
  @@index([serviceDate])
}

model TechnicalReportMedia {
  id          String           @id @default(cuid())
  reportId    String
  filename    String
  path        String                                      // path local /uploads/reports/
  mimeType    String
  size        Int
  uploadedBy  String
  createdAt   DateTime         @default(now())
  report      TechnicalReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([reportId])
}

model TechnicalReportAnnotation {
  id          String           @id @default(cuid())
  reportId    String
  authorId    String
  authorRole  SignerRole
  field       String                                      // qual campo da ficha
  comment     String           @db.Text
  resolved    Boolean          @default(false)
  resolvedAt  DateTime?
  createdAt   DateTime         @default(now())
  report      TechnicalReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  author      User             @relation(fields: [authorId], references: [id])

  @@index([reportId, resolved])
}

model TechnicalReportSignature {
  id          String           @id @default(cuid())
  reportId    String
  signerId    String?                                     // null se cliente externo
  signerName  String                                      // nome digitado/exibido
  role        SignerRole
  imagePath   String                                      // PNG salvo em /uploads/reports/signatures/
  ip          String?
  signedAt    DateTime         @default(now())
  report      TechnicalReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  signer      User?            @relation(fields: [signerId], references: [id])

  @@index([reportId])
}
```

Migration: `pnpm prisma migrate dev --name add_technical_reports`.

### 1.2 — Module + Controller + Service

Estrutura em `backend/src/presentation/controllers/technical-reports/`:

| Método | Path | Guards | DTO | Resumo |
|---|---|---|---|---|
| GET | `/technical-reports` | JWT, Sector, Roles | Query: `status?`, `sector?`, `serviceDateFrom?`, `serviceDateTo?`, `page?`, `limit?` | Lista filtrada por sector |
| GET | `/technical-reports/:id` | JWT, Sector | — | Detalhes com `media`, `annotations`, `signatures` |
| POST | `/technical-reports` | JWT, Roles(AGENT, ADMIN_*) | `CreateTechnicalReportDto` | Cria DRAFT; auto-numera (`RT-YYYY-NNNN`) |
| PATCH | `/technical-reports/:id` | JWT, Sector | `UpdateTechnicalReportDto` | Update enquanto DRAFT/REWORK |
| PATCH | `/technical-reports/:id/status` | JWT, Roles(AGENT, ADMIN_*) | `{ status }` | Submit / approve / send to rework |
| DELETE | `/technical-reports/:id` | JWT, Roles(ADMIN_*) | — | Soft-delete (apenas DRAFT) |
| POST | `/technical-reports/:id/media` | JWT, Sector, FileInterceptor | `file` (multipart) | Upload em `./uploads/reports/`; reusa Multer config do chat |
| GET | `/technical-reports/:id/media/:mediaId/file` | JWT, Sector | — | Serve binário com Content-Disposition |
| DELETE | `/technical-reports/:id/media/:mediaId` | JWT, Sector | — | Apenas autor ou ADMIN_* |
| POST | `/technical-reports/:id/annotations` | JWT, Sector | `{ field, comment }` | Engineer/technician comenta |
| PATCH | `/technical-reports/:id/annotations/:annId/resolve` | JWT, Sector | — | Marca como resolvida |
| POST | `/technical-reports/:id/sign` | JWT, Sector, FileInterceptor | `file` (PNG) + `{ role, signerName }` | Salva PNG, cria `TechnicalReportSignature` |

### 1.3 — DTOs

`backend/src/domain/dtos/technical-report/`:
- `create-technical-report.dto.ts` — `class-validator` em todos os campos, sector vem do JWT (não trust no body)
- `update-technical-report.dto.ts` — `extends PartialType(CreateTechnicalReportDto)`
- `query-technical-report.dto.ts` — paginação + filtros
- `create-annotation.dto.ts`
- `sign-technical-report.dto.ts` — `role: SignerRole`, `signerName: string`

### 1.4 — Storage de mídia

**Decisão:** seguir o padrão existente do backend (Multer + diskStorage, `./uploads/reports/`). **Não introduzir S3 nesta fase** — fica para futuro hardening. Volume Docker já mapeia `./uploads`.

- Limite: 25 MB por arquivo (mesma config do chat)
- Tipos: `image/*`, `video/*` para mídia; `image/png` apenas para assinaturas
- Filename: UUID + extensão original

### 1.5 — Auto-numeração `RT-YYYY-NNNN`

Service usa transação Prisma:
```typescript
const year = new Date().getFullYear();
const last = await prisma.technicalReport.findFirst({
  where: { number: { startsWith: `RT-${year}-` } },
  orderBy: { number: 'desc' },
});
const n = last ? parseInt(last.number.slice(-4)) + 1 : 1;
const number = `RT-${year}-${String(n).padStart(4, '0')}`;
```

### 1.6 — Aceitação Fase 1

- [ ] Migration aplicada, schema sincronizado
- [ ] `POST /technical-reports` cria DRAFT com numeração correta
- [ ] `POST /:id/media` aceita upload, retorna entidade `TechnicalReportMedia`
- [ ] `POST /:id/sign` aceita PNG e cria `TechnicalReportSignature` com IP capturado de `req.ip`
- [ ] `GET /technical-reports` filtra por sector do JWT (não query param)
- [ ] Status transitions validam: `DRAFT → SUBMITTED → APPROVED|REWORK`, `REWORK → SUBMITTED`
- [ ] Smoke E2E manual: criar → upload foto → anotar → assinar → aprovar

---

## Fase 2 — Backend: ajustes pequenos

**Estimativa:** 1 dia.

### 2.1 — `PATCH /users/me/preferences` (opcional, baixa prioridade)

Para o `SectorSwitcher` persistir entre sessões/dispositivos. **Pode ser pulado se a decisão for manter local-only por ora** (o setor real continua vindo do JWT/host).

```typescript
// users.controller.ts
@Patch('me/preferences')
@UseGuards(JwtAuthGuard)
async updateMyPreferences(@CurrentUser() user, @Body() dto: UpdatePreferencesDto) {
  // dto: { preferredSector?: Sector, theme?: 'light'|'dark'|'system' }
}
```

Schema: adicionar `User.preferredSector Sector?` e `User.preferredTheme String?`.

> **Decisão recomendada:** **NÃO implementar agora.** SectorSwitcher é ferramenta dev/admin para preview de tema; em prod o setor vem do host. Apenas gatear o componente atrás de `import.meta.env.DEV` no front.

### 2.2 — Verificar pipeline de Push

A auditoria mostrou: endpoints `/push/subscribe` e `/push/unsubscribe` existem, mas **envio de push notifications não foi visto em nenhum service**. Verificar se `SlaBreachJob`/`AlertService` realmente chamam `web-push`. Se não, implementar `PushNotificationService` que consome `PushSubscription` model + `web-push` lib.

- [ ] Confirmar VAPID keys em `.env.example` e `env.validation.ts`
- [ ] Implementar `PushNotificationService.sendToUser(userId, payload)` se ausente
- [ ] Wire em `AlertService` quando `sentViaPush: true`

---

## Fase 3 — Frontend: rewiring (remover mocks, plugar backend real)

**Estimativa:** 3–4 dias.
**Pré-requisito:** Fase 1 mergeada e rodando local.

### 3.1 — `lib/api.ts` — adicionar services novos

```typescript
export const technicalReportsService = {
  list: (params) => api.get('/technical-reports', { params }),
  get: (id) => api.get(`/technical-reports/${id}`),
  create: (dto) => api.post('/technical-reports', dto),
  update: (id, dto) => api.patch(`/technical-reports/${id}`, dto),
  setStatus: (id, status) => api.patch(`/technical-reports/${id}/status`, { status }),
  delete: (id) => api.delete(`/technical-reports/${id}`),
  uploadMedia: (id, file) => { const fd = new FormData(); fd.append('file', file); return api.post(`/technical-reports/${id}/media`, fd); },
  deleteMedia: (id, mediaId) => api.delete(`/technical-reports/${id}/media/${mediaId}`),
  addAnnotation: (id, dto) => api.post(`/technical-reports/${id}/annotations`, dto),
  resolveAnnotation: (id, annId) => api.patch(`/technical-reports/${id}/annotations/${annId}/resolve`),
  sign: (id, pngBlob, meta) => { const fd = new FormData(); fd.append('file', pngBlob, 'signature.png'); fd.append('role', meta.role); fd.append('signerName', meta.signerName); return api.post(`/technical-reports/${id}/sign`, fd); },
};

export const loansService = {
  list: (params) => api.get('/tools/loans', { params }),
  get: (toolId) => api.get(`/tools/${toolId}`),
  loan: (toolId, dto) => api.post(`/tools/${toolId}/loan`, dto),
  return: (toolId) => api.post(`/tools/${toolId}/return`),
};
```

### 3.2 — Reescrever `lib/reports.ts`

Substituir o `reportStore` (localStorage) por chamadas a `technicalReportsService`. Manter a interface (mesmas funções) para minimizar mudanças em `reports.tsx`. **Eliminar tudo que toca `localStorage.getItem(KEY)` e `crypto.randomUUID()` para IDs.**

### 3.3 — `routes/_authed/reports.tsx`

- Trocar `reportStore.list()` por `useQuery(['technicalReports', filters], () => technicalReportsService.list(filters))`
- Mutations com `useMutation` invalidando query
- `SignaturePad` exporta PNG via `canvas.toBlob()` (não `toDataURL()`) e envia ao `technicalReportsService.sign(id, blob, meta)`
- Upload de mídia: `<input type="file" multiple>` → `technicalReportsService.uploadMedia(id, file)` por arquivo

### 3.4 — `components/LoansPanel.tsx`

- Apagar `mockLoans` e o default `loans = mockLoans`
- Componente recebe `loans` por prop, vinda de `useQuery(['loans'], loansService.list)` no caller
- Adapter pequeno: backend retorna `ToolLoan` → mapear para `LoanItem` que o componente espera (campos: `toolName`, `borrower`, `expectedReturn`, `status`)

### 3.5 — Remover fallbacks `catch { return demoData }`

Arquivos:
- `routes/_authed/tickets.index.tsx`
- `routes/_authed/chat.index.tsx`
- `routes/_authed/chat.$ticketId.tsx`
- `routes/_authed/tickets.$id.tsx`
- `routes/_authed/purchases.tsx`

**Padrão:** o `catch` deve apenas re-lançar (ou logar via `devLog`). O ErrorBoundary do TanStack + um `<Toaster>` com `sonner` cobrem o UX de erro. Sem fallback silencioso para mock.

### 3.6 — `AuthContext.tsx`

Remover **completamente**:
```typescript
const DEMO_USERS = { "ti@msm": ..., "eletrica@msm": ..., ... };
```

Reescrever `login(email, password)` para chamar **só** `authService.login()`. O backend já retorna cookie httpOnly + body com user.

`devLogin()` — duas opções:
- **(a) Remover completamente.** Console dev fica protegido por feature flag (3.8).
- **(b) Manter mas gate por `import.meta.env.DEV`** — nunca empacota em build prod.

**Recomendação: (b).** Útil para desenvolver sem backend rodando.

### 3.7 — `routes/login.tsx`

- Remover o "Demo box" com credenciais visíveis
- Pode manter um botão "Login Dev" só em `import.meta.env.DEV`

### 3.8 — Gate `/dev/*` por env

`routes/dev.tsx` e `routes/dev-login.tsx`:
```typescript
beforeLoad: () => {
  if (!import.meta.env.DEV) throw redirect({ to: '/' });
}
```
Em build de produção (`bun run build`), Vite `tree-shake`a a árvore inteira.

### 3.9 — `__root.tsx` cleanup

- Apagar `SECTOR_MANIFESTS` e `SECTOR_ICONS` (linhas ~36–58) — código morto. Será reintroduzido com forma correta na Fase 4.
- Trocar meta `title: "Lovable App"` e descrições "Profile Driven App" por strings reais do projeto (ex: "Helpdesk MSM").

### 3.10 — Aceitação Fase 3

- [ ] Nenhuma referência a `DEMO_USERS`, `mockLoans`, `reportStore`, `demoData()`, `demoTicket()` no `src/`
- [ ] `grep -rn "Lovable" src/` retorna 0 ocorrências
- [ ] Build prod (`bun run build`) não inclui rotas `/dev/*` (verificar bundle)
- [ ] Smoke: login com user real → criar ticket → criar relatório técnico → assinar → ver na lista

---

## Fase 4 — ~~PWA: restaurar 3 manifests por subdomínio~~ **CANCELADA (decisão 2026-05-10)**

> **Decisão do dono do projeto:** manter **PWA único** com setor vindo do JWT/login (não do host). Anula a estratégia "1 manifest por subdomínio" do [IMPLEMENTATION_PLAN_V3.md](IMPLEMENTATION_PLAN_V3.md) §1 e [CLAUDE.md](CLAUDE.md).
>
> **Trade-off aceito:** os 3 subdomínios continuam servindo o mesmo build. O usuário instala apenas 1 PWA, e o tema/sidebar/abas seguem o `sector` do JWT após login. Em dispositivo compartilhado o último login define o "tema" — aceito.

### Substituída pela 3.11 — Sector vem do JWT (PWA único)

**Estimativa:** ~0,5 dia. **Status:** ✅ implementada 2026-05-10.

Mudanças efetuadas:

1. **[src/routes/__root.tsx](../profile-driven-app/src/routes/__root.tsx)** — `AuthProvider` movido para fora de `ThemeProvider` para que o tema possa ler `useAuth().sector`.
2. **[src/contexts/ThemeContext.tsx](../profile-driven-app/src/contexts/ThemeContext.tsx)** — sector agora vem de `useAuth().sector`. Pré-login, fallback para `detectSectorFromHost()` (mantém UX coerente na tela de login se o usuário acessar via `eletrica.*`).
3. **[src/routes/_authed.tsx](../profile-driven-app/src/routes/_authed.tsx)** — removido o redirect entre subdomínios (`SECTOR_DOMAINS` map e bloco `if (userSector !== hostSector && import.meta.env.PROD)`). Os 3 subdomínios servem o mesmo app sem redirect cruzado.
4. **[src/components/SectorSwitcher.tsx](../profile-driven-app/src/components/SectorSwitcher.tsx)** — gateado por `import.meta.env.DEV`. Em produção retorna `null` (setor é imutável, vem do JWT). Em DEV continua útil para previewar temas.
5. **[src/routes/_authed/settings.tsx](../profile-driven-app/src/routes/_authed/settings.tsx)** — removido o gate `(isAdmin || isDev) && <SectorSwitcher />`; o componente se auto-protege via env-flag.

**Não-mudanças (por design):**
- Backend continua filtrando por `req.user.sector` (JWT) em `SectorGuard` — comportamento correto e suficiente para o modelo PWA único.
- CORS continua aceitando os 3 subdomínios (cookie `.helpdeskmsm.com.br`) — qualquer host serve o mesmo app sem custo adicional.
- `public/manifest.webmanifest` permanece único.

**Aceitação:**
- [x] Type-check limpo (`npx tsc --noEmit` exit 0)
- [ ] Smoke: login com user TI → vê tema azul; logout, login com user Elétrica no MESMO dispositivo → tema vira dourado sem mudar de host (validar manualmente)
- [ ] Confirmar que ADMIN não consegue trocar de setor em build de produção (intencional)

---

## Fase 5 — Hardening produção

**Estimativa:** 2 dias.

### 5.1 — Env flags

Em `profile-driven-app`:
- `VITE_API_URL` — obrigatório em prod
- `VITE_ENABLE_DEV_LOGIN` — `false` em prod
- Falhar build se faltar var crítica (Vite `define` + `throw`)

### 5.2 — Service Worker só em PROD

`vite.config.ts`: `VitePWA({ devOptions: { enabled: false } })`. Confirmar que SW não roda em dev (regra do [CLAUDE.md](CLAUDE.md)).

### 5.3 — Compressão de fotos antes de upload

Para `TechnicalReportMedia` e mídias do chat: `browser-image-compression` antes de `FormData`. Limite: 1920x1080, quality 0.8, max 2 MB por foto.

### 5.4 — Validação cruzada Host vs sector (já em `IMPLEMENTATION_PLAN_V3.md` §0.4)

Confirmar que está implementado: middleware backend compara `req.headers.host` com `req.user.sector`. Se já: marcar como done. Se não: implementar agora junto com integration.

### 5.5 — Aceitação Fase 5

- [ ] `bun run build` falha se `VITE_API_URL` ausente
- [ ] Lighthouse PWA score ≥ 90 em cada subdomínio
- [ ] Foto de 5 MB tirada no celular vira upload de ~1.5 MB
- [ ] Tentativa de TI acessar `compras.*` retorna 403

---

## Fase 6 — Validação E2E

**Estimativa:** 1 dia.

Adicionar à suite Playwright (frontend):
1. **Auth real** — login com user de seed do backend
2. **Multi-subdomínio** — `helpdeskmsm.local` test setup, navegação cruzada bloqueada
3. **Technical report flow** — criar → upload foto → anotar → assinar → submit → approve
4. **Loans** — listar empréstimos reais, criar empréstimo, devolver
5. **Push subscription** — registrar SW, subscribe, dispatch fake push do backend, verificar notificação

---

## Sequência recomendada

```
Fase 1 (backend technical-reports)  ──┐
                                      ├─→ Fase 3 (front rewiring) ─→ Fase 6 (E2E)
Fase 2 (push pipeline + opcional)  ──┘                       │
                                                              │
                              Fase 5 (hardening) ─────────────┘
```

- **Fase 1** é o caminho crítico (backend novo).
- **Fase 2.1** (`/users/me/preferences`) é OPCIONAL — pulada após decisão PWA único.
- **Fase 4** **cancelada** (PWA único, sector via JWT).
- **Fase 5** depois de 3.
- **Fase 6** trava o release.

**Total estimado:** 10–12 dias úteis (1 dev) ou 6–7 dias (2 devs paralelos) — reduzido após cancelamento da Fase 4.

---

## Checklist global "remover todos os mocks"

| # | Mock | Arquivo | Ação | Fase |
|---|---|---|---|---|
| 1 | `reportStore` (localStorage) | `lib/reports.ts` | Reescrever para chamar `technicalReportsService` | 3.2 |
| 2 | `DEMO_USERS` hardcoded | `contexts/AuthContext.tsx` | Apagar | 3.6 |
| 3 | `devLogin("msm-dev-2026")` | `contexts/AuthContext.tsx`, `routes/dev-login.tsx` | Gate por `import.meta.env.DEV` ou apagar | 3.6, 3.8 |
| 4 | `mockLoans` array | `components/LoansPanel.tsx` | Trocar por `loansService.list()` | 3.4 |
| 5 | `demoData()` em tickets/chat/purchases | 5 rotas | Apagar fallback | 3.5 |
| 6 | `demoTicket()` | `chat.$ticketId.tsx`, `tickets.$id.tsx` | Apagar | 3.5 |
| 7 | Demo box com credenciais visíveis | `routes/login.tsx` | Apagar (ou gate dev) | 3.7 |
| 8 | Feature flags em localStorage (`ff:*`) | `routes/dev.index.tsx` | Manter — é console dev | 3.8 (gate) |
| 9 | `SECTOR_MANIFESTS`/`SECTOR_ICONS` órfãos | `routes/__root.tsx` | Apagar (ou repropor com forma correta) | 3.9 / 4.2 |
| 10 | Branding "Lovable App" | `routes/__root.tsx` | Trocar por "Helpdesk MSM" | 3.9 |
| 11 | ~~Manifest unificado~~ | `public/manifest.webmanifest` | **Mantido** — decisão PWA único (2026-05-10) | — |
| 12 | Base64 inline para mídia/assinatura | `lib/reports.ts`, `SignaturePad` consumer | Trocar por upload multipart | 3.2, 3.3 |
| 13 | `role: "DEV"` no localStorage | `dev-login.tsx` | Gate dev (não vira role real) | 3.8 |
| 14 | `crypto.randomUUID()` para IDs de domínio | `lib/reports.ts` | IDs vêm do backend | 3.2 |

---

## Notas operacionais

- **Stash backup:** `stash@{0}` (mensagem `pre-lovable-merge-2026-05-10`) tem 7 arquivos com integrações backend que você fez antes do merge. Não pop direto — primeiro veja o diff (`git stash show -p stash@{0}`) e cherry-pick manualmente o que ainda fizer sentido (vários arquivos foram reescritos pela Lovable).
- **Forward-merge `origin/main` deste repo:** o checklist V3 ainda lista isso pendente — recomendo fazer **antes** da Fase 1 para evitar conflito do schema novo com mudanças de main.
- **Não fazer push do `feature/chatbot-upgrade` ainda** até concluir Fase 3 — branch está com 49 commits ahead e ainda muda muito.
