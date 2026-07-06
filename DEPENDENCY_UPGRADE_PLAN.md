# Plano de Atualização de Dependências — Bumps MAJOR

> Escopo: pacotes que exigem bump de versão MAJOR (fora da faixa semver atual do
> `package.json`). Atualizações "seguras" (dentro da faixa `^`) já foram aplicadas
> em 2026-07-06 via `npm update`/`bun update` + `npm audit fix` — ver seção
> "Atualizações já aplicadas" abaixo — e não fazem parte do roadmap deste documento.
>
> Formato: 1 grupo de pacotes por fim de semana, com janela de manutenção de ~2-4h.
> Cada item traz: breaking changes relevantes, risco específico deste projeto,
> passos de migração e como testar. No fim, o roadmap sequenciado.

## Como usar este documento

- Sempre criar uma branch dedicada por fim de semana (`chore/deps-<pacote>-major`),
  nunca subir direto pra `develop`/`main`.
- Rodar a bateria de testes indicada em "Como testar" ANTES de merge.
- Se algo quebrar e não for resolvido dentro da janela: reverter a branch (não
  investigar ao vivo em produção), abrir um item de retomada e reagendar.
- Backend: sempre rodar `npm run test` + `npm run test:cov` e o smoke manual
  indicado. Frontend: rodar `npm run lint`, `npm run build`, e os specs de e2e
  relevantes em `Frontend-chatbot/e2e/` (Playwright).

---

## Atualizações já aplicadas (2026-07-06)

Executado como Parte A de uma rodada de manutenção (fora do escopo deste roadmap,
já concluído):

- **Backend**: `npm update` (1014 pacotes, tudo dentro da faixa `^` já existente)
  + `npm audit fix` (corrigiu `qs` — DoS moderado — e `ws` — memory
  disclosure/exhaustion alto — sem breaking changes).
- **Frontend**: `bun update` (189 pacotes, tudo dentro da faixa `^` já existente).
- **Achado durante a atualização segura**: mesmo dentro da faixa `^1.4.0`, o bump de
  `@lovable.dev/vite-tanstack-config` (1.4.0→1.8.0) quebrou `vite.config.ts` — a
  opção `cloudflare: false` foi renomeada para `nitro: false` numa versão *minor*
  (não documentada publicamente). Corrigido no próprio `vite.config.ts`. Isso
  **confirma na prática** o que a pesquisa deste documento já sinalizava: este
  pacote é uma "caixa-preta" que não segue semver de forma confiável — reforça a
  cautela extra recomendada para o bump 2.x na seção 2.5 abaixo.
- **`npm audit` no backend — 2 vulnerabilidades altas remanescentes, exigem
  `--force` (bump major), não aplicadas nesta rodada segura:**
  - **`nodemailer` <=9.0.0** — [GHSA-p6gq-j5cr-w38f](https://github.com/advisories/GHSA-p6gq-j5cr-w38f):
    a opção `raw` no nível de mensagem contorna `disableFileAccess`/`disableUrlAccess`,
    permitindo leitura arbitrária de arquivo e SSRF via mensagem. **Só corrigido na
    v9.0.3** — isso eleva a prioridade real do item 1.2 abaixo (não é só rotina de
    manutenção, é uma CVE ativa). Já é o primeiro item do roadmap (fim de semana 1);
    manter prioridade alta.
  - **`semver` 2.0.0-alpha–5.7.1** (transitivo via `imap` → `utf7` →`semver`) —
    [GHSA-c2qf-rxjj-qqgw](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw): ReDoS.
    Exposição prática **baixa hoje** — `EmailIngestionService` está desabilitado em
    produção (confirmado no log de boot: "Email ingestion is disabled"). Mesmo
    assim, agendar correção — ver novo item 1.5 abaixo.

---

## 1. Backend — pacotes

### 1.1 `bcryptjs` 2.4.3 → 3.0.3
**Uso no projeto:** hash/verificação de senha em `auth.service.ts`, `users.service.ts`,
`admin.service.ts` (login, reset de senha, criação de usuário/onboarding).

- **Breaking changes relevantes:** passa a exportar ESM por padrão, mas com **fallback UMD**
  (continua funcionando com `require`/`import * as bcrypt`). Hash default passa a gerar
  variante `2b` em vez de `2a` — **hashes antigos continuam validando normalmente**
  (bcrypt detecta a versão pelo prefixo do hash), então não há necessidade de re-hash em massa.
  Assinaturas de `hash()`/`compare()`/`hashSync()`/`compareSync()` não mudam.
- **Risco:** **Baixo**. API idêntica, uso no projeto é só `hash()`/`compare()` simples.
  Único cuidado: confirmar que o `require`/import atual (`import * as bcrypt from 'bcryptjs'`)
  continua resolvendo corretamente com o novo formato de pacote sob `moduleResolution`
  atual do backend (bundler/commonjs).
- **Passos de migração:** bump direto no `package.json` (dependency + `@types/bcryptjs`
  se necessário), `npm install`, rodar `tsc --noEmit` para garantir que os tipos batem.
  Sem codemod necessário.
- **Como testar:** rodar os specs existentes de auth/users, e manualmente: login de
  um usuário existente (hash antigo `2a`/`2y`) + criação de usuário novo + reset de
  senha + login com a senha nova. Confirmar os 3 fluxos usam `bcrypt.hash`/`compare`
  com sucesso.

### 1.2 `nodemailer` 8.0.11 → 9.0.3 — **prioridade alta (CVE ativa)**
**Uso no projeto:** `mail.service.ts` (SMTP Hostinger via `createTransport`, `sendMail`
simples com `text`/`html`, sem anexos/URLs remotas), disparado em onboarding de agente
(`sendAgentWelcome`) e notificações.

- **Motivo da prioridade:** `npm audit` confirmado em 2026-07-06 aponta
  [GHSA-p6gq-j5cr-w38f](https://github.com/advisories/GHSA-p6gq-j5cr-w38f) (alta) —
  SSRF/leitura arbitrária de arquivo via opção `raw` de mensagem — só corrigido na v9.0.3.
- **Breaking changes relevantes:** validação de certificado TLS agora é **estrita por
  padrão** para requisições HTTPS feitas ao buscar conteúdo remoto (anexos via URL,
  endpoints OAuth2, proxy HTTP/HTTPS CONNECT). Não afeta `sendMail` puro com
  `text`/`html` inline como este projeto usa. Vários hardenings de segurança em
  parsing de STARTTLS/endereços — nenhum deles muda a API pública usada aqui.
- **Risco:** **Baixo** de regressão (uso mais simples possível, sem attachments/OAuth2/proxy).
  O único ponto de atenção real é confirmar que o certificado do SMTP da Hostinger é
  válido (não self-signed) — já deve ser, por ser provedor comercial.
- **Passos de migração:** bump direto. **Atualizar também `@types/nodemailer`**
  (dependência de tipos que precisa acompanhar o major). Sem codemod.
- **Como testar:** rodar `transporter.verify()` (já chamado no bootstrap, olhar o
  log `SMTP transporter conectado`), e enviar de fato um e-mail de teste (ex.
  `sendAgentWelcome` para uma conta de teste) em ambiente de staging, confirmando
  recebimento e formatação HTML.

### 1.3 `pdfmake` 0.2.23 → 0.3.11
**Uso no projeto:** `agent-report-pdf.service.ts` (relatório de desempenho em PDF,
feature recente) — usa hoje `require('pdfmake')` retornando a classe `PdfPrinter`
diretamente, e `require('pdfmake/build/vfs_fonts.js')` com fallback defensivo
(`vfsModule.pdfMake?.vfs || vfsModule.vfs || vfsModule`) pra pegar o objeto vfs em
base64 das fontes Roboto.

- **Breaking changes relevantes:** a 0.3 **unifica a interface entre Node e browser**
  e muda como as fontes são registradas: em vez do arquivo `vfs_fonts.js`, o padrão
  novo é `PdfPrinter`/`pdfmake` expor um método `addFonts(fonts)` recebendo os
  arquivos de fonte diretamente (path ou buffer), não mais um blob vfs base64
  monolítico. Também unifica métodos para retornar Promises em vez de callbacks, e
  muda parâmetros da função `pageBreakBefore`.
- **Risco:** **Médio**. É feature nova (baixo risco de regressão em fluxos legados),
  mas a forma de registrar as fontes Roboto muda de raiz — o código atual já tem uma
  camada de fallback defensiva pro formato do vfs, sinal de que o time já sofreu com
  isso antes; é bem provável que seja necessário reescrever o bloco de inicialização
  do `PdfPrinter`/fontes por completo, não só trocar a versão.
- **Passos de migração:**
  1. Ler a doc oficial de migração de 0.1/0.2 → 0.3 (`pdfmake.github.io/docs/0.3/`).
  2. Trocar a inicialização: manter os buffers das fontes Roboto (`Buffer.from(...,'base64')`)
     mas adaptar para a API nova (`addFonts`/construtor atualizado, testar qual das
     duas formas o server-side aceita na versão exata instalada).
  3. Remover o `require('pdfmake/build/vfs_fonts.js')` se a nova API não precisar mais
     dele, ou manter só se a versão final ainda expuser esse arquivo.
  4. Rodar `tsc --noEmit` (o código já usa `require` com `eslint-disable`, então erros
     de tipo podem não aparecer — testar a geração de fato é obrigatório).
- **Como testar:** gerar um relatório de desempenho real (endpoint que dispara
  `AgentReportPdfService`) para um agente com dados variados (nomes com acento,
  textos longos) e abrir o PDF gerado, conferindo: fontes carregando (sem "tofu"/quadrados
  no lugar do texto), negrito/itálico funcionando, layout não quebrado, paginação ok.

### 1.4 `class-validator` 0.14.4 → 0.15.1
**Uso no projeto:** validação de DTOs em praticamente todos os controllers (36
arquivos), com `ValidationPipe` global em `main.ts` configurado com
`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

- **Breaking changes relevantes:** `forbidUnknownValues` passa a ser **`true` por
  padrão** — objetos sem nenhuma propriedade decorada por `class-validator`, ou
  grupos de validação (`groups`) que resultam em zero validadores aplicados, agora
  **falham** a validação em vez de passar silenciosamente. `@IsIBAN()` ganha um novo
  argumento de opções (não usado neste projeto — baixo risco aqui especificamente).
- **Risco:** **Médio** — não pelo volume de arquivos, mas porque o
  `forbidUnknownValues` default novo pode derrubar endpoints com **DTOs vazios ou
  sem decorators**, e valida grupos (`@ValidateIf`, `groups: [...]`) que hoje podem
  já não ter nenhum decorator aplicável em certos cenários. Como o `ValidationPipe`
  do Nest já roda `whitelist`+`forbidNonWhitelisted`, o comportamento pode se
  sobrepor de forma não óbvia — só teste end-to-end pega.
- **Passos de migração:** bump direto, sem codemod. Depois, **grep manual** por DTOs
  com corpo vazio ou 100% opcional sem decorators (`class ...Dto {}` ou só campos sem
  decorators) e por usos de `groups`/`@ValidateIf` em DTOs.
- **Como testar:** rodar a suíte completa de testes do backend (`npm run test`);
  depois, smoke manual em Postman/Insomnia batendo em pelo menos um endpoint de cada
  controller que recebe body (tickets, users, admin, purchase-requests, technical-reports)
  com payload válido e um payload vazio, conferindo que os que devem aceitar corpo
  vazio (se houver) continuam aceitando e os demais continuam rejeitando como antes.

### 1.5 `uuid` 13.0.2 → 14.0.1 — **recomendação: NÃO fazer bump, substituir a dependência**
**Uso no projeto:** só 4 arquivos, só para `v4()` (confirmado por grep em 2026-07-06):
`src/common/interceptors/trace-id.interceptor.ts`,
`src/presentation/controllers/chat/chat.module.ts`,
`src/presentation/controllers/technical-reports/technical-reports.module.ts`,
`src/presentation/controllers/tickets/tickets.module.ts`.

- **Breaking change crítico:** desde a v12, `uuid` é **ESM-only** — sem build
  CommonJS. O backend inteiro roda em CJS (`tsconfig.json` com `"module": "commonjs"`,
  `package.json` sem `"type": "module"`, compilado por `nest build`/`ts-loader`,
  testado por Jest+`ts-jest`). Um `import { v4 as uuidv4 } from 'uuid'` direto **não
  vai compilar/rodar** nesse ambiente sem converter todo o backend pra ESM (projeto à
  parte, não algo pra fazer "de passagem" num fim de semana).
- **Risco:** **Alto se for feito como bump simples** (quebra build). **Baixo se for
  feito como substituição.**
- **Passo recomendado (em vez de upgrade):** trocar os 4 usos de
  `import { v4 as uuidv4 } from 'uuid'` por `import { randomUUID } from 'node:crypto'`
  (nativo desde Node 14.17, e o backend já roda em Node 22 — `node:22-alpine` no
  Dockerfile). Depois, **remover `uuid` e `@types/uuid` do `package.json`** por
  completo. Isso resolve o problema de vez sem depender do pacote.
- **Como testar:** confirmar que trace-id de request continua único por requisição
  (`x-request-id` no response), que upload de mídia no chat gera nome de arquivo
  único sem colisão, e que os testes de `tickets`/`technical-reports` que dependem de
  IDs gerados continuam passando.

### 1.6 `imap` (transitivo: `utf7` → `semver` vulnerável) — item novo, baixa urgência
**Achado em 2026-07-06** via `npm audit` (não fazia parte do levantamento original de
majors). [GHSA-c2qf-rxjj-qqgw](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw) —
ReDoS numa versão antiga de `semver` usada internamente por `utf7` (dependência do
`imap`). Fix automático (`npm audit fix --force`) instala `imap@0.8.17` — o npm marca
como "breaking change" por reorganizar a árvore de dependências, não porque a API do
`imap` mude.

- **Risco:** **Baixo no momento** — `EmailIngestionService` está **desabilitado** em
  produção hoje (log de boot confirma). Exposição real só existiria se a ingestão de
  e-mail for reativada sem essa correção.
- **Passos de migração:** rodar `npm audit fix --force` isolado (só esse pacote),
  confirmar que `imap@0.8.17` ainda atende ao uso atual do `EmailIngestionService`
  (mesmo desabilitado, o código deve compilar/tipar igual).
- **Como testar:** `tsc --noEmit`; se/quando a ingestão de e-mail for reativada,
  testar conexão IMAP de fato antes de habilitar em produção.
- **Quando fazer:** pode entrar no mesmo fim de semana do item 1.1/1.2 (baixo risco,
  independente dos demais).

### 1.7 `amqplib` 0.10.9 → 2.0.1
**Uso no projeto:** `RabbitMQService` (`backend/src/infrastructure/messaging/`) —
conexão única, `assertQueue` para `incoming_messages`/`outgoing_messages`/
`update_ticket`/`notifications`, publish/consume simples com `ack`/`nack`, mais
lógica de reconexão manual (`setTimeout` de 5s em erro/close).

- **Breaking changes relevantes:** requisito mínimo de Node subiu para v18+ (já
  atendido, backend roda Node 22). Mudança de comportamento: `heartbeat: 0` agora
  **desabilita** heartbeats de fato (antes era tratado como "sem preferência",
  deixando o servidor decidir) — se o `RABBITMQ_URL`/config não passar `heartbeat`
  explicitamente isso não afeta nada (confirmado que não passa hoje). Dependência
  `bitsyntax` removida (sem impacto de app). Traz `connectWithRecoveryPromise`/
  `connectWithRecoveryCallback` novos (reconexão automática nativa) — não
  obrigatório usar, mas é oportunidade de simplificar a reconexão manual existente.
- **Risco:** **Médio-alto** — não pela API (estável, Promise-based desde a 0.10), mas
  porque é o transporte da fila do bot de WhatsApp (mensagens entrando/saindo em
  tempo real). Qualquer regressão de conexão/reconexão afeta atendimento ao vivo.
  Testar em horário de baixo tráfego é essencial.
- **Passos de migração:** bump direto de `amqplib` + `@types/amqplib` (dev). Revisar
  se `RABBITMQ_URL` ou algum lugar passa `heartbeat: 0` explicitamente. Opcional:
  avaliar trocar o `reconnect()` manual por `connectWithRecoveryPromise` num momento
  posterior (não obrigatório nesta janela).
- **Como testar:** subir o ambiente completo (docker-compose com RabbitMQ), verificar
  log `RabbitMQ conectado`, enviar uma mensagem de teste via WhatsApp de ponta a
  ponta (chegada → fila `incoming_messages` → processamento → resposta pela fila
  `outgoing_messages`), e simular queda de conexão (restart do container RabbitMQ)
  confirmando que a reconexão automática (`reconnect()`) volta a funcionar e as
  filas continuam sendo consumidas depois.

### 1.8 `@prisma/client` + `prisma` 6.19.3 → 7.8.0 — tratar à parte, com mais tempo
**Uso no projeto:** ORM de todo o domínio (`Ticket`, `User`, `Sector`, mensagens,
relatórios técnicos etc. em `backend/prisma/schema.prisma`), além de scripts
standalone (`prisma/seeds/settings.seed.ts`,
`prisma/migrations-data/migrate-tickets-from-prod.ts`) que importam `@prisma/client`
diretamente via `tsx`.

- **Breaking changes relevantes (as que mais afetam este projeto):**
  - **ESM-only.** Mesmo problema do `uuid`, só que multiplicado: o client gerado
    passa a ser um módulo ESM. Isso conflita com o `tsconfig` CJS do Nest
    (`"module": "commonjs"`) usado por `nest build`/Jest/`ts-jest`/`ts-loader`.
  - **Path de output obrigatório**: o generator precisa de `output = "./generated/prisma"`
    no schema, e todo `import { PrismaClient } from '@prisma/client'` no código vira
    `import { PrismaClient } from '<output>/client'` — impacto em **todos os
    services** que hoje importam `PrismaClient`/tipos gerados.
  - **Driver adapter obrigatório**: Postgres passa a exigir `@prisma/adapter-pg`
    explícito na instanciação do client (engine Rust removido).
  - **`prisma.config.ts` na raiz do backend**, substituindo config espalhada em env
    vars/flags de CLI — inclusive a URL de migração (`directUrl` fica deprecado).
  - **`$use()` (middleware) removido** — se houver algum middleware Prisma no
    projeto, precisa virar Client Extension (`$extends`).
  - **Seed automático removido**: `prisma migrate dev` não roda mais o seed
    sozinho — o script `migrate:tickets`/`prisma:seed` do `package.json` precisa ser
    chamado explicitamente sempre.
  - Certificado SSL do Postgres passa a ser **validado por padrão** (antes era
    ignorado) — pode quebrar conexão se o Postgres de produção usar certificado
    autoassinado sem configurar `rejectUnauthorized: false`/CA.
- **Risco:** **O mais alto de toda a lista.** Não é só "trocar versão": é uma
  reescrita estrutural (adapters, config file, imports em todo o codebase, possível
  necessidade de mover partes do backend para ESM ou usar `import()` dinâmico a
  partir do CJS). Não existe codemod oficial — o próprio Prisma recomenda usar um
  prompt de IA como assistência, não uma ferramenta automática.
- **Recomendação explícita:** **não tratar isso como 1 fim de semana de manutenção
  comum.** Sugerido:
  1. Fazer isso **por último**, só depois que todo o resto da lista estiver estável.
  2. Rodar a migração inteira primeiro numa **cópia de staging do banco** (nunca
     direto em produção), com o dobro (ou mais) do tempo reservado de uma janela
     normal — tratar como 2 janelas: uma de "ensaio" (dry run em staging) e uma de
     "corte" (cutover em produção), cada uma com plano de rollback testado de
     verdade (não só documentado).
  3. Validar explicitamente com o dono do produto se vale a pena migrar para v7
     *agora* — dado que v6 continua recebendo patches de segurança por um tempo e
     não há requisito funcional novo forçando o major, adiar pode ser a decisão certa.
- **Passos de migração (alto nível, para quando for executar):**
  1. `npm install @prisma/client@7 prisma@7 @prisma/adapter-pg`.
  2. Criar `prisma.config.ts` na raiz do backend.
  3. Adicionar `output` no generator do `schema.prisma`, rodar `prisma generate`.
  4. Atualizar **todos** os imports de `@prisma/client` para o novo path gerado
     (buscar com grep — hoje é usado em praticamente toda a camada `infrastructure`/
     `application`).
  5. Reescrever a instanciação do `PrismaClient` (provavelmente em um
     `PrismaService`/`PrismaModule` único) para usar o adapter `@prisma/adapter-pg`.
  6. Resolver o conflito ESM/CJS: ou (a) mover o backend inteiro para ESM (grande,
     arriscado, testar `nest build`+Jest+`ts-node` exaustivamente), ou (b) isolar o
     client Prisma atrás de um módulo carregado via `import()` dinâmico dentro do
     código CJS existente (mais contido, mas exige cuidado em todo lugar que hoje
     injeta `PrismaService` de forma síncrona).
  7. Atualizar `prisma/seeds/settings.seed.ts` e
     `prisma/migrations-data/migrate-tickets-from-prod.ts` (scripts standalone via
     `tsx`) para o novo import path.
  8. Rodar `prisma migrate dev`/`prisma generate` explicitamente (seed não roda mais sozinho).
- **Como testar:** suíte completa (`npm run test` + `npm run test:cov`), depois
  smoke test manual cobrindo CRUD de `Ticket`/`User`/mensagens, geração/consulta de
  relatórios técnicos, e rodar o script de migração de tickets em ambiente de
  staging (não produção) para garantir que ele ainda funciona com o client novo.
  Conferir logs de conexão SSL com o Postgres de produção antes do cutover real.

---

## 2. Frontend — pacotes

### 2.1 `zod` 3.25.76 → 4.4.3
**Uso no projeto:** só 2 arquivos usam `z` diretamente hoje — `ProfileCard.tsx`
(schema de perfil: nome, e-mail, etc.) e `set-password.tsx` (schema de busca com
token). `@hookform/resolvers` está instalado mas **não há uso de `zodResolver`** no
código — os 2 schemas são usados fora do React Hook Form (validação manual/`useSearch`
do TanStack Router).

- **Breaking changes relevantes:** validadores de string viram funções top-level
  (`z.string().email()` → `z.email()`, `z.string().uuid()` → `z.uuid()`); `.strict()`/
  `.passthrough()` viram `z.strictObject()`/`z.looseObject()`; `z.record()` passa a
  exigir 2 argumentos (schema de chave + valor); comportamento de `.default()` dentro
  de campo `.optional()` muda (agora aplica o default mesmo dentro de optional);
  `._def` interno vira `._zod.def` (só importa se algo acessar internals, não é o caso aqui).
- **Risco:** **Baixo** — pegada de uso é pequena (2 arquivos) e sem métodos
  encadeados exóticos (`.email()`/`.uuid()` não aparecem nos 2 arquivos hoje, mas
  vale checar de novo no momento da migração).
- **Passos de migração:** rodar o codemod oficial antes de editar manualmente:
  `npx @zod/codemod --transform v3-to-v4 --dry-run ./src` para ver o que mudaria,
  depois sem `--dry-run` para aplicar. Revisar os 2 arquivos manualmente depois.
- **Como testar:** testar manualmente o formulário de perfil (`ProfileCard`:
  salvar nome/e-mail válido e inválido, conferir mensagens de erro) e o fluxo de
  `set-password` (link de ativação com/sem token na URL).

### 2.2 `recharts` 2.15.4 → 3.9.2
**Uso no projeto:** `src/routes/_authed/admin/dashboard.tsx` e
`src/components/ui/chart.tsx` (wrapper usado em relatórios).

- **Breaking changes relevantes:** reescrita interna de gerenciamento de estado;
  `CategoricalChartState` (acesso ao estado interno em event handlers/`Customized`)
  removido; várias props internas "vazadas" via clone de elementos foram removidas
  da API pública; dependências `recharts-scale` e `react-smooth` internalizadas;
  `CartesianGrid` ganha `x/yAxisId` próprios — se não corresponderem aos IDs de
  `XAxis`/`YAxis`, as linhas de grid somem silenciosamente; `alwaysShow` (deprecated)
  removido de `Reference*`.
- **Risco:** **Médio** — poucos arquivos (2), mas é visual/comportamental e usado no
  dashboard admin (visível para gestores). Regressões costumam ser silenciosas
  (grid sumindo, tooltip com dado errado), não erros de compilação.
- **Passos de migração:** ler o guia oficial de migração
  (`github.com/recharts/recharts/wiki/3.0-migration-guide`), revisar
  `chart.tsx`/`dashboard.tsx` procurando por: acesso a estado interno em handlers,
  uso de `alwaysShow`, IDs custom em `XAxis`/`YAxis`/`CartesianGrid`. Sem codemod oficial.
- **Como testar:** abrir o dashboard admin com dados reais/seed, comparar
  visualmente antes/depois (grid, tooltip ao passar o mouse, cores, legendas),
  testar em pelo menos 2 tamanhos de tela (responsividade do `ResponsiveContainer`).

### 2.3 `lucide-react` 0.575.0 → 1.23.0
**Uso no projeto:** 66 arquivos, 132 ícones distintos importados (levantamento feito
via grep). Nenhum ícone de marca (GitHub/Twitter/etc.) e nenhum dos ícones
conhecidos como renomeados/removidos (ex. `ExternalLink`) aparece na lista atual.

- **Breaking changes relevantes:** remoção de **todos os ícones de marca** (não
  usados aqui); alguns ícones renomeados por consistência (ex.
  `ExternalLink` → `SquareArrowOutUpRight` — não usado neste projeto); build UMD
  removido (só ESM/CJS — Vite lida bem com isso); redução de ~32% no tamanho do bundle.
- **Risco:** **Baixo apesar do volume de arquivos.** É uma mudança "larga mas rasa":
  toca muitos arquivos só porque o pacote é muito importado, mas como nenhum ícone
  usado hoje foi removido/renomeado (confirmado por grep contra a lista de mudanças
  conhecidas), o bump deve ser praticamente mecânico.
- **Passos de migração:** bump direto, rodar `tsc --noEmit` (pega imports quebrados
  de ícones renomeados, caso a lista de renomeações seja maior do que a documentada
  publicamente) e `npm run build`. Sem codemod necessário dado o escopo confirmado.
- **Como testar:** `npm run build` sem erros de tipo é o principal sinal (import de
  ícone que não existe mais quebra a build). Depois, navegação visual rápida pelas
  telas mais carregadas de ícones (sidebar, tickets, admin) conferindo que nada
  sumiu/ficou com ícone de fallback quebrado.

### 2.4 `react-day-picker` 9.14.0 → 10.0.1
**Uso no projeto:** só `src/components/ui/calendar.tsx` (componente de calendário
usado em filtros de data).

- **Breaking changes relevantes:** release de "limpeza" — remove props/aliases já
  deprecados desde a v9 (`fromDate`, `toDate`, `fromMonth`, `toMonth`, `fromYear`,
  `toYear`, `initialFocus`, vários `onDay*` de mouse/touch deprecados,
  `components.Button` em favor de `PreviousMonthButton`/`NextMonthButton`); calendários
  não-gregorianos (hebraico/hijri/persa — não usados aqui) viram pacotes separados;
  nome do pacote muda para `@daypicker/react` mas `react-day-picker` continua
  funcionando por compatibilidade.
- **Risco:** **Baixo** — 1 arquivo só, e o `calendar.tsx` atual usa `captionLayout`/
  `formatters`/`classNames` (API atual, não as props deprecadas removidas).
- **Passos de migração:** bump direto, revisar `calendar.tsx` contra a lista de
  props/aliases removidos (grep rápido por `fromDate|toDate|fromMonth|toMonth|
  fromYear|toYear|initialFocus|components.Button` no arquivo — não encontrados hoje).
  Sem codemod.
- **Como testar:** abrir todo formulário com filtro de data (ex. relatórios,
  filtros de tickets), testar seleção de dia, navegação entre meses/anos, e range
  se houver.

### 2.5 Grupo de build: `typescript` + `vite` + `@vitejs/plugin-react` + `@lovable.dev/vite-tanstack-config`
**Por que juntos:** todos mexem no mesmo pipeline (`vite.config.ts` usa
`@lovable.dev/vite-tanstack-config` como wrapper de config do Vite/TanStack Start,
que por sua vez depende de Vite e do plugin React) — atualizar um sem os outros tem
alta chance de incompatibilidade de versão entre eles.

> **Precedente real (2026-07-06):** mesmo um bump *minor* do
> `@lovable.dev/vite-tanstack-config` (1.4.0→1.8.0, dentro da faixa `^` já
> existente) quebrou `vite.config.ts` — a opção `cloudflare` foi renomeada para
> `nitro` sem aviso de breaking change. Isso confirma que este pacote específico
> precisa de atenção redobrada mesmo fora de um bump major "oficial".

- **`typescript` 5.8.3 → 6.0.3:**
  - Breaking changes: remove `moduleResolution: "classic"` (não usado aqui, projeto
    já usa `"Bundler"`); `esModuleInterop`/`allowSyntheticDefaultImports` não podem
    mais ser `false` (já são implicitamente `true` hoje); `strict` passa a ser
    `true` por padrão (frontend já tem `"strict": true` explícito, sem impacto);
    `types` passa a default para `[]` em vez de puxar todos os `@types/*`
    automaticamente (frontend já declara `"types": ["vite/client"]` explicitamente
    — sem impacto esperado, mas checar `@playwright/test`/outros tipos usados implicitamente).
  - **Atenção redobrada**: esta é a mesma classe de risco que já quebrou um build
    real no backend nesta sessão (por um motivo diferente — diretório bogus, não
    dependência — mas mesma categoria de "TS novo + ferramenta de build" merece cautela).
    Antes do bump, confirmar que `@lovable.dev/vite-tanstack-config@2.x` e
    `@vitejs/plugin-react@6.x`/`vite@8.x` já declaram suporte a TS 6 nos seus
    `peerDependencies`/changelog — não assumir compatibilidade.
- **`vite` 7.3.1 → 8.1.3:**
  - Breaking changes: troca de esbuild+Rollup por **Rolldown** (bundler em Rust) +
    Oxc + Lightning CSS como stack padrão; `build.rollupOptions`/`worker.rollupOptions`
    renomeados para `rolldownOptions`; import de default de módulos CJS passa a ter
    regra mais explícita; `import.meta.hot.accept(url)` não aceita mais URL, só id.
    Existe camada de compatibilidade que converte config antiga de esbuild/Rollup
    automaticamente na maioria dos casos.
- **`@vitejs/plugin-react` 5.0.4 → 6.0.3:**
  - Breaking change principal: **Babel deixa de ser dependência padrão** (React
    Refresh via Oxc agora). Só importa se o projeto usar a opção `babel` do plugin
    diretamente — não encontrado no `vite.config.ts` atual, mas checar se o wrapper
    `@lovable.dev/vite-tanstack-config` injeta alguma config `babel` internamente.
- **`@lovable.dev/vite-tanstack-config` 1.4.0 → 2.7.0:**
  - Pacote proprietário/de terceiro pequeno, sem changelog público detalhado
    encontrado — tratar como **caixa-preta de risco desconhecido** (confirmado na
    prática pelo precedente do box acima). É o pacote mais central da lista
    (envolve `tanstackStart.spa`, `nitro`, todo o pipeline de build do SPA servido
    por nginx).
- **Risco do grupo:** **Alto** — é o pipeline de build inteiro. Combinação de (a)
  stack de bundler trocada (Rolldown), (b) TS major, e (c) wrapper de terceiro sem
  changelog público visível e com histórico já confirmado de breaking change silenciosa.
- **Passos de migração:**
  1. Fazer o bump **dos 4 juntos**, nunca isolado (evita ficar preso em combinação
     não testada pelos mantenedores).
  2. Rodar `npm run build` localmente primeiro (não só `dev`) — o `dev` costuma
     mascarar problemas de bundling que só aparecem no build de produção.
  3. Conferir se `build.rollupOptions` (se existir configuração customizada em algum
     lugar não visto neste levantamento) precisa virar `rolldownOptions`.
  4. Rodar `tsc --noEmit` isolado do build do Vite para separar erros de tipo de
     erros de bundling.
  5. Checar de novo, com atenção, todas as opções de `defineConfig()` do
     `@lovable.dev/vite-tanstack-config` contra o `.d.ts` instalado (mesmo processo
     que resolveu o `cloudflare`→`nitro` desta rodada).
- **Como testar:** `npm run build` limpo (sem warnings novos inesperados),
  `npm run preview` servindo o build de produção localmente, navegação completa
  pelas rotas principais (login, tickets, dashboard admin, purchase requests),
  confirmar que o SPA prerenderizado (`spa.prerender.outputPath: "/index"`) ainda
  gera `dist/client/index.html` corretamente para o nginx servir. Rodar a suíte
  Playwright completa (`npm run test:e2e`) — é o teste mais forte de regressão de
  bundling porque exercita a aplicação real no browser.

### 2.6 Grupo de lint: `eslint` + `@eslint/js` + `eslint-plugin-react-hooks` + `globals`
**Uso no projeto:** `eslint.config.js` já usa **flat config** (`export default
tseslint.config(...)`), então o projeto já está no formato exigido pelo ESLint 10+.

- **Breaking changes relevantes:** ESLint 10 **remove completamente** o suporte a
  `.eslintrc.*`/legado (não é usado aqui, sem impacto); passa a localizar
  `eslint.config.*` a partir do diretório do arquivo lintado, não do cwd (irrelevante
  em projeto single-package); `loadESLint()` sempre retorna a classe flat; **tracking
  de referências JSX** passa a existir (pode gerar novos warnings/erros de regras
  como `no-unused-vars`/`react-hooks` em componentes que usam JSX de forma que antes
  "escapava" da análise de escopo — risco real de CI quebrar por lint mais rigoroso,
  não por bug real). Node mínimo passa a ser 20.19+ (frontend já roda em Node/Bun
  recentes, sem impacto).
- **Risco:** **Baixo para runtime, médio para CI** — nenhum destes pacotes roda em
  produção, mas o tracking de JSX novo pode fazer aparecer dezenas de erros de lint
  que hoje passavam despercebidos (ex. variáveis "usadas" só dentro de JSX que o
  parser antigo não via).
- **Passos de migração:** bump dos 4 juntos, rodar `npm run lint` e **ler a lista
  completa de erros antes de decidir** entre corrigir um a um ou ajustar regras
  (`rules` no `eslint.config.js`) para downgrade pontual (`warn` em vez de `error`)
  como medida temporária, documentando a dívida técnica.
- **Como testar:** `npm run lint` limpo (ou com a lista de exceções documentada),
  garantir que o pipeline de CI (se houver `lint` como gate) não quebra o merge de
  outros PRs em andamento.

---

## 3. Roadmap sequenciado por fim de semana

> Ordem: começa pelos mais isolados/baixo risco, termina nos mais arriscados
> (grupo de build do frontend e Prisma), com mais tempo reservado nesses últimos.
> Cada fim de semana é independente — se um atrasar, os seguintes só esperam a vez,
> não precisam ser adiados em cascata.

### Fim de semana 1 — Backend: autenticação, e-mail e IMAP (baixo risco, 1 item com CVE)
- **Pacotes:** `bcryptjs` 2.4.3→3.0.3, `nodemailer` 8.0.11→9.0.3 (+ `@types/nodemailer`,
  **prioridade alta — CVE ativa**), `imap` (via `npm audit fix --force` isolado).
- **Fazer:** bump de todos numa branch só (`chore/deps-auth-mail-major`), `npm install`,
  `tsc --noEmit`.
- **Testar antes de concluir:** suíte de testes do backend passando; login manual
  com usuário existente (hash antigo) + criação de usuário novo; envio real de
  e-mail de boas-vindas em staging; `npm audit` sem essas 2 CVEs.
- **Rollback:** branch isolada, não mergeada até os testes passarem; se já
  mergeado e algo quebrar em produção, `git revert` do commit de bump (mudança
  contida a `package.json`/lockfile).

### Fim de semana 2 — Backend: validação e IDs (baixo/médio risco)
- **Pacotes:** `class-validator` 0.14.4→0.15.1; **`uuid`: não fazer bump — substituir
  os 4 usos por `crypto.randomUUID()` e remover a dependência.**
- **Fazer:** bump do `class-validator`; refatorar os 4 arquivos que usam `uuid` para
  `node:crypto`; remover `uuid`/`@types/uuid` do `package.json`.
- **Testar antes de concluir:** suíte completa; grep manual por DTOs vazios/grupos
  de validação; smoke test em Postman nos principais controllers (tickets, users,
  admin) com payload válido e vazio; conferir `x-request-id` único por request e
  nomes de arquivo únicos no upload de mídia do chat.
- **Rollback:** `git revert`; como `uuid` deixou de ser dependência, reverter volta
  a usar o pacote antigo sem conflito.

### Fim de semana 3 — Backend: relatório em PDF (médio risco, feature isolada)
- **Pacotes:** `pdfmake` 0.2.23→0.3.11
- **Fazer:** reescrever a inicialização de fontes/`PdfPrinter` em
  `agent-report-pdf.service.ts` conforme a nova API (`addFonts`/construtor
  atualizado); reservar tempo extra para tentativa e erro no formato do vfs.
- **Testar antes de concluir:** gerar um relatório real com dados variados (acentos,
  textos longos), abrir o PDF e conferir fontes/formatação/paginação.
- **Rollback:** `git revert` isolado (feature nova, sem outros pontos do sistema
  dependendo do PDF); manter branch separada até validação visual completa.

### Fim de semana 4 — Backend: fila RabbitMQ (médio-alto risco, horário de baixo tráfego)
- **Pacotes:** `amqplib` 0.10.9→2.0.1 (+ `@types/amqplib`)
- **Fazer:** bump; revisar se algum lugar passa `heartbeat: 0` explicitamente
  (confirmado que não hoje, mas reconferir no schema de config); executar em
  horário de baixo volume de atendimento.
- **Testar antes de concluir:** subir docker-compose completo, log de conexão OK,
  teste end-to-end de mensagem WhatsApp real (entrada → fila → resposta), simular
  queda/restart do RabbitMQ e confirmar reconexão automática.
- **Rollback:** manter o RabbitMQ do docker-compose com volume intacto; `git
  revert` do bump; reiniciar o serviço backend aponta de volta pra versão anterior
  sem perda de mensagens (filas são `durable`).

### Fim de semana 5 — Frontend: formulários e datas (baixo risco, independentes)
- **Pacotes:** `zod` 3.25.76→4.4.3, `react-day-picker` 9.14.0→10.0.1
- **Fazer:** rodar `npx @zod/codemod --transform v3-to-v4 --dry-run ./src` primeiro,
  aplicar depois; bump direto do `react-day-picker`.
- **Testar antes de concluir:** formulário de perfil (`ProfileCard`) e `set-password`
  com token válido/inválido; qualquer filtro de data (seleção de dia, navegação de
  mês/ano).
- **Rollback:** `git revert`; ambos pacotes são isolados (poucos arquivos), reversão
  segura e rápida.

### Fim de semana 6 — Frontend: ícones e gráficos (baixo/médio risco, independentes)
- **Pacotes:** `lucide-react` 0.575.0→1.23.0, `recharts` 2.15.4→3.9.2
- **Fazer:** bump de `lucide-react` + `npm run build` (pega ícones renomeados via
  erro de tipo); bump de `recharts` + revisão manual de `chart.tsx`/`dashboard.tsx`
  contra o guia de migração oficial.
- **Testar antes de concluir:** build limpo sem erro de import de ícone; navegação
  visual pelas telas mais carregadas de ícones; dashboard admin com dados reais
  comparando visualmente grid/tooltip/legendas antes e depois.
- **Rollback:** `git revert`; se só um dos dois quebrar, reverter apenas aquele
  commit (fazer commits separados por pacote mesmo estando no mesmo fim de semana).

### Fim de semana 7 e 8 — Frontend: pipeline de build (alto risco, mais tempo reservado)
- **Pacotes:** `typescript` 5.8.3→6.0.3, `vite` 7.3.1→8.1.3, `@vitejs/plugin-react`
  5.0.4→6.0.3, `@lovable.dev/vite-tanstack-config` 1.4.0→2.7.0 — **todos juntos**
- **Fim de semana 7 (ensaio):** fazer o bump numa branch isolada, focar só em
  conseguir `npm run build` + `npm run preview` funcionando localmente, sem pressa
  de mergear. Reservar a janela inteira (4h) só para isso.
- **Fim de semana 8 (validação/merge):** rodar a suíte Playwright completa
  (`npm run test:e2e`), navegar manualmente por todas as rotas principais, validar
  o SPA prerenderizado servido pelo nginx (não só `vite preview`), só então mergear.
- **Testar antes de concluir:** build de produção limpo; preview local navegável;
  Playwright 100% verde; smoke test do build real atrás do nginx (staging).
- **Rollback:** branch separada durante todo o processo (não mergear até o fim de
  semana 8 fechar); se already mergeado e quebrar em produção, reverter os 4 bumps
  juntos (não parcialmente, para não deixar combinação de versões não testada).

### Fim de semana 9 — Frontend: lint (baixo risco de runtime, atenção ao CI)
- **Pacotes:** `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `globals`
- **Fazer:** só depois do grupo de build estar estável (evita confundir erro de
  lint novo com erro de build). Bump dos 4 juntos, rodar `npm run lint` e decidir
  arquivo a arquivo se corrige ou faz downgrade temporário de regra.
- **Testar antes de concluir:** `npm run lint` limpo ou com lista de exceções
  documentada e aceita pelo time; CI não bloqueando outros PRs.
- **Rollback:** `git revert` simples (dependências de dev, sem impacto em runtime).

### Fim de semana 10+ — Backend: Prisma (risco máximo, tratar como projeto à parte)
- **Pacotes:** `@prisma/client` + `prisma` 6.19.3→7.8.0
- **Antes de tudo:** alinhar com o dono do produto se faz sentido migrar agora ou
  esperar uma versão 7.x mais madura / o time ter mais tranquilidade. Esta etapa
  **não deve ser tratada como uma janela de 2-4h**.
- **Fim de semana A (ensaio em staging, cópia do banco):** montar `prisma.config.ts`,
  adapter `@prisma/adapter-pg`, resolver o conflito ESM/CJS (decidir entre mover o
  backend pra ESM ou isolar o Prisma atrás de `import()` dinâmico), atualizar todos
  os imports de `@prisma/client`, rodar contra uma **cópia** do banco de produção,
  nunca o banco real.
- **Fim de semana B (cutover):** só depois do ensaio 100% validado — testar seed,
  script de migração de tickets (`migrate-tickets-from-prod.ts`), CRUD completo de
  `Ticket`/`User`/mensagens/relatórios técnicos, conexão SSL com o Postgres real.
- **Testar antes de concluir:** suíte completa + `test:cov`; smoke manual de CRUD
  em todas as entidades críticas; script de migração de tickets rodando limpo em
  staging; conexão SSL de produção validada antes do cutover.
- **Rollback:** manter branch separada até o fim de semana B fechar completamente;
  ter backup do banco de produção feito **imediatamente antes** do cutover (não só
  o backup de rotina); se algo quebrar pós-deploy, reverter o deploy do backend
  para a imagem/versão anterior primeiro (restaura Prisma 6) e só depois investigar
  com calma — nunca debugar Prisma 7 ao vivo com tickets reais em jogo.

---

## Fontes consultadas na pesquisa original

- [Upgrade to Prisma ORM 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma 7 Release: Rust-Free, Faster, and More Compatible](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [amqplib CHANGELOG.md](https://github.com/amqp-node/amqplib/blob/main/CHANGELOG.md)
- [bcrypt.js v3.0.0 release notes](https://github.com/dcodeIO/bcrypt.js/releases/tag/v3.0.0)
- [Nodemailer CHANGELOG.md](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md)
- [pdfmake 0.3 docs — Server-side](https://pdfmake.github.io/docs/0.3/getting-started/server-side/)
- [pdfmake 0.3 docs — VFS](https://pdfmake.github.io/docs/0.3/fonts/custom-fonts-client-side/vfs/)
- [class-validator CHANGELOG.md](https://github.com/typestack/class-validator/blob/develop/CHANGELOG.md)
- [uuid CHANGELOG.md](https://github.com/uuidjs/uuid/blob/main/CHANGELOG.md)
- [Zod v4 migration guide](https://zod.dev/v4/changelog)
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)
- [Lucide migration from v0](https://lucide.dev/guide/react/migration)
- [React DayPicker — Upgrading to v10](https://daypicker.dev/upgrading)
- [TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [Vite 8.0 announcement](https://vite.dev/blog/announcing-vite8)
- [Vite migration from v7](https://vite.dev/guide/migration)
- [vite-plugin-react CHANGELOG](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md)
- [ESLint — Migrate to v10.0.0](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
- [nodemailer GHSA-p6gq-j5cr-w38f](https://github.com/advisories/GHSA-p6gq-j5cr-w38f)
- [semver GHSA-c2qf-rxjj-qqgw](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw)
