# Duração de sessão configurável + deslogar todos (console /dev)

> Status: planejado, **não implementado ainda**. Deixado pra execução depois (por mim ou outro agente).
> Criado em: 2026-06-30

## Contexto

Em 2026-06-30 deslogamos todo mundo na marra (trocando `JWT_SECRET` e reiniciando o backend) porque hoje **não existe nenhum jeito de fazer isso pelo sistema** — a duração da sessão é fixa no código (JWT = 7 dias hardcoded em `backend/src/presentation/controllers/auth/auth.module.ts:21`, cookie = 8h hardcoded em `backend/src/presentation/controllers/auth/auth.controller.ts:63`, os dois dessincronizados entre si) e não há nenhuma lista de revogação de token.

O pedido: um painel no console `/dev` pra configurar a duração do login, de um jeito que **diminuir o valor desloga quem já está logado há mais tempo que o novo valor** — não só muda o prazo pras próximas vezes que logarem.

Investigando o backend, já existe um **sistema genérico de Settings** (`backend/prisma/schema.prisma` model `Setting`, tabela `settings`, chave-valor com `dataType`), com service/controller/DTOs prontos (`backend/src/presentation/controllers/settings/`), `GET/POST/PUT` já funcionando, `POST /settings` já faz upsert, escrita já travada em `ADMIN`. **Não precisa criar nada novo de schema** — só usar o que já existe.

## Abordagem

**Duas chaves novas em `settings`** (sem migration — é tabela chave-valor genérica):
- `auth.session.duration_hours` (number, categoria "auth") — duração da sessão em horas.
- `auth.session.invalidated_at` (number, categoria "auth", epoch em segundos) — "deslogar todos a partir de agora": qualquer token emitido ANTES desse timestamp passa a ser rejeitado, não importa a duração.

**Validação roda em todo request autenticado** (`JwtStrategy.validate`), comparando o `iat` (timestamp de quando o token foi emitido, já vem no payload do JWT) contra essas duas configurações lidas do banco — não contra o `exp` fixo gravado no próprio token. Isso é o que faz a mágica pedida: mudar a config agora afeta sessões que já existem, não só logins futuros.

### Backend

1. **`backend/src/presentation/controllers/auth/jwt.strategy.ts`**
   - Injeta `SettingsService` (precisa importar `SettingsModule` em `AuthModule`).
   - Em `validate(payload)`, depois de `validateUser`, busca `durationHours = await settings.getValue('auth.session.duration_hours', 8)` e `invalidatedAt = await settings.getValue('auth.session.invalidated_at', 0)`.
   - Se `(Date.now()/1000 - payload.iat) > durationHours * 3600` **ou** `payload.iat < invalidatedAt` → `throw new UnauthorizedException('Sessão expirada')`.

2. **`backend/src/presentation/controllers/auth/auth.service.ts`** (método `login`)
   - Lê o mesmo `durationHours` antes de assinar o token.
   - `this.jwt.sign({...}, { expiresIn: \`${durationHours}h\` })` — token novo já nasce com a duração configurada (hoje ignora isso e usa sempre 7d do module).
   - Retorna `expiresInSeconds` no resultado pro controller usar no cookie.

3. **`backend/src/presentation/controllers/auth/auth.controller.ts`**
   - Cookie `maxAge` passa a usar `expiresInSeconds * 1000` em vez do `8 * 60 * 60 * 1000` fixo.
   - Novo endpoint `POST /auth/force-logout-all` (mesmo padrão de checagem manual `if (req.user.role !== 'ADMIN') throw ForbiddenException` que `register` já usa) — grava `auth.session.invalidated_at = Math.floor(Date.now()/1000)` via `settingsService.upsert(...)`. Timestamp gerado no servidor, não confia em valor vindo do client.

4. **`backend/src/presentation/controllers/auth/auth.module.ts`** — importa `SettingsModule`.

### Frontend

1. **`Frontend-chatbot/src/lib/api.ts`**
   - `settingsService.get(key)` / `.upsert(key, value, dataType)` (mapeia pro `GET/POST /settings`).
   - `authService.forceLogoutAll()` (`POST /auth/force-logout-all`).

2. **`Frontend-chatbot/src/routes/dev.index.tsx`** — novo Card na aba "system" (mesmo padrão visual dos cards "Ambiente"/"Armazenamento" já existentes ali):
   - **"Duração da sessão"**: input numérico (horas) pré-carregado do backend (fallback 8 se a chave ainda não existe — `GET` pode dar 404 na primeira vez, trato como "ainda não configurado"), botão "Salvar". Texto de aviso: "Sessões mais antigas que esse valor são encerradas automaticamente no próximo acesso — inclusive as que já estão logadas."
   - **"Deslogar todos agora"**: botão destrutivo separado (com confirmação — reaproveitar o padrão de `AlertDialog`/`Dialog` de confirmação já usado em outras ações destrutivas desse mesmo arquivo), chama `forceLogoutAll()`. Ação imediata e incondicional, independente do valor de duração configurado.

## Verificação
- Login com um usuário de teste, confirmar cookie/token válidos.
- Setar duração pra um valor bem baixo (ex: 0.01h = 36s), esperar passar esse tempo, confirmar que uma chamada autenticada com o token antigo retorna 401.
- Logar de novo, confirmar que o novo token funciona (duração nova aplicada a partir daí).
- Clicar "Deslogar todos agora" com um token válido recém-emitido → confirmar que o próximo request com esse token também dá 401 (cobre o caso "agora mesmo", sem depender da duração).
- Confirmar que endpoints normais do settings (`GET/POST /settings`) continuam funcionando pra outras chaves (sem regressão).

## Arquivos a tocar (resumo)
- `backend/src/presentation/controllers/auth/jwt.strategy.ts`
- `backend/src/presentation/controllers/auth/auth.service.ts`
- `backend/src/presentation/controllers/auth/auth.controller.ts`
- `backend/src/presentation/controllers/auth/auth.module.ts`
- `Frontend-chatbot/src/lib/api.ts`
- `Frontend-chatbot/src/routes/dev.index.tsx`
