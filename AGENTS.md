# AGENTS.md — Chatbot-suporte-ti (backend)

> Arquivo de instruções para agentes. Mantenha mínimo e verificado.
>順: follow IMPLEMENTATION_PLAN_V3.md for all architecture decisions.

---

## Como operar neste repo

### Commits e comentários: **sempre em pt-BR**

Qualquer commit, comentário em código, ou mensagem de merge: **pt-BR**. Não usar `fix:`, `feat:` em inglês. Exemplos:
- `fix: corrige IDOR cross-sector em tickets.controller.ts`
- `chore: remove GLPI de 14 arquivos`
- `feat: adiciona circuit breaker em hermes-integration`

---

## ⚠️ armadilhas que causam falha silenciosa

### `git add -A` é perigoso aqui
Este repo contém **14 subrepos embedded** que o git tenta stagear automaticamente:
```
hermes-agent/  suport-eletric/  support-compras/  support-mobile/  support-ti/
```
Se você rodar `git add -A`, vai criar commits gigantes com conteúdo undesired. Use:
- `git add arquivo.ts` (adicionar por nome, individualmente)
- `git add -A -- ':!hermes-agent/' ':!suport-eletric/' ...` (excluir subrepos)

### Arquivos com owner root bloqueiam operações
`backend/uploads/attachments/*.webm` são root-owned (filmagem de celular). Git restore/checkout falha. Antes de operar nesses arquivos:
```bash
sudo git restore backend/uploads/attachments/
```

### nginx config **nunca foi commitado**
尽管 commit `6b1cfa8` diz "nginx multi-tenant config (4 server blocks)", o arquivo `nginx/sites-enabled/helpdeskmsm.conf` nunca foi rastrear. Se precisar, criar do zero.

---

## comandos de desenvolvimento

### Ordem correta: lint → typecheck → test → build
```bash
cd backend
bun run lint                    # ESLint 9 flat config (eslint.config.js)
bun run build                  # NestJS build
bun run test                   # Jest unit (src/ — não e2e/)
bun run test:e2e              # Playwright E2E (backend/e2e/) — requer postgres+redis+running backend
```

### Prisma
```bash
cd backend
npx prisma format              # normaliza schema (sempre usar antes de migrate)
npx prisma migrate dev --name nome-da-migration
npx prisma studio              # visualizador DB (dev)
```

### Docker
```bash
# health check de todos os serviços
curl http://localhost:3000/health  # backend
curl http://localhost:3003/health  # hermes-tools

# validar compose sem subir
docker compose -f docker-compose.yml config --quiet

# validar nginx config
docker run --rm -v "$PWD/nginx:/etc/nginx/conf.d:ro" nginx:alpine nginx -t
```

### WhatsApp (Hermes)
```bash
docker logs -f helpdesk_hermes         # ver QR code
docker exec -it helpdesk_hermes hermes whatsapp  # regenerar sessão
```

---

## Arquitetura de módulos (o que importa para não errar)

### Onde está cada coisa

| Camada | Local | Regra |
|--------|-------|-------|
| Controllers HTTP | `backend/src/presentation/controllers/` | **Nunca** importa PrismaService direto |
| Use Cases (regr negocio) | `backend/src/application/` | Orquestram, sem HTTP, sem Prisma |
| Repositories | `backend/src/infrastructure/repositories/` | **Única** camada que toca Prisma |
| Services infra | `backend/src/infrastructure/services/` | Redis, RabbitMQ, email, push |
| Entities/DTOs | `backend/src/domain/` | Pure, sem dependências de framework |

### Padão de injeção
```typescript
// ✅ Certo: controller usa use case, não repository direto
constructor(private readonly findTickets: FindTicketsUseCase)

// ❌ Errado: controller injeta PrismaService ou Repository direto
constructor(private readonly prisma: PrismaService)
```

### Auth — tipo do req.user
```typescript
// passport-jwt declara Request.user como { user?: User }
import { AuthUser } from '@/middleware/auth';
const user = req.user as AuthUser;  // cast necessário
```

### Logger — fonte correta
```typescript
import { Logger } from '@nestjs/common';  // ✅
import { Logger } from '@nestjs/websockets'; // ❌ não exporta
```

---

## Padrões críticos (erros comuns)

### Filtro por sector: SEMPRE server-side
Nunca use query param do cliente para setor. O JWT contém sector — usar `user.sector` do token, não `req.query.sector`.

### Circuit breaker (Hermes bridge)
Todas as 10 tool implementations em `hermes-integration/backend-tools/server.js` DEVEM usar `safeBackendRequest()`:
```javascript
const result = await backendCircuit.fire(() => api.executeTool(name, params));
const data = result.data;  // não result.data.data
```

### Docker compose — volumes duplicados
O `docker-compose.yml` tem duaschaves `volumes:` no mesmo nível (linhas 139 e 155). Sempre que editar, verificar se não duplicou.

### API response errors
```typescript
// ✅ correto: extrair .data
const data = result.data;
// ❌ errado: acessar duas vezes
const data = result.data.data;
```

---

## Repos siblings (não mexer aqui)

- Frontend: `~/Projetos/profile-driven-app/` — TanStack Start + React 19 + Tailwind 4 + Bun
- Nginx (produção): config vive aqui (`nginx/sites-enabled/`), mas docker-compose referencia `./nginx:/etc/nginx/conf.d`

---

## Status do branch

`feature/chatbot-upgrade`: 151 commits ahead de `main`. Branch de produção — não force-push, não rebase. Merge strategy: `--no-ff` sequencial (não squash).

`main` e `develop` rodam em produção em paralelo. Sem janela de merge confirmada ainda. Aguardar 1-2 semanas.

---

## Redmine

- `backend/GUARDS_USAGE_GUIDE.md` — como usar JwtAuthGuard, SectorGuard, RolesGuard
- `docs/playbook.md` — Playwright E2E suite (3 fluxos)
- `docs/agents.md` — instruções de agentes (legado, parcial)