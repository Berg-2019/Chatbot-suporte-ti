# Smoke Deploy — Resultados (2026-05-12)

> Smoke do `docker-compose.yml` de produção contra host local (Ubuntu 25.10,
> Docker 29.1.3 + Compose v2.40). Encontrou e corrigiu 4 problemas reais.

## ✅ Validado funcionando

### Build de imagens
| Image | Size | Tempo | Status |
|---|---|---|---|
| `chatbot-suporte-ti-backend` (NestJS 11) | 588 MB | 33s | ✅ build limpo |
| `chatbot-suporte-ti-frontend` (TanStack + Bun) | 1.28 GB | 22-57s | ✅ build limpo, prerender SPA shell ok |
| `chatbot-suporte-ti-hermes-tools` | (cache) | n/a | ✅ image dev preexistente |
| `chatbot-suporte-ti-hermes` | (cache, 4.91 GB) | n/a | ⚠️ não rebuildei (timeout puxando node:20-alpine, image dev preexistente) |

### Runtime
- **Backend NestJS 11 sobe limpo** localmente: alcança `Nest application successfully started` antes de detectar EADDRINUSE (porta usada pelo dev).
- **Frontend builder popula volume** corretamente: `Frontend dist populated. Container idle.` no log; volume contém `index.html`, `assets/`, `icons/{ti,electric,compras}/`, `manifest.webmanifest`, `offline.html`, `registerSW.js` (workbox PWA).
- **`docker compose config`** valida sem erros (modulo warnings de env vars não preenchidas).

### NestJS 11 upgrade (commit `47c9596`)
- `tsc --noEmit`: 0 erros
- `npm test`: 61/61 passando
- `npm audit`: 24 → 3 vulnerabilidades (87% redução)
- Bootstrap completo até `NestApplication successfully started`

---

## 🔧 Problemas encontrados e corrigidos durante o smoke

### 1. TanStack Start gerava SSR sem `index.html`
**Sintoma:** `dist/client/` tinha `assets/`, `icons/`, manifest, mas **nenhum HTML standalone**. nginx falhava ao servir SPA.

**Causa raiz:** `@lovable.dev/vite-tanstack-config` ativa `@cloudflare/vite-plugin` no build, que sobrescreve o output pra Cloudflare Workers (SSR no edge, sem HTML estático). O TanStack Start tem flag `spa.enabled` que faz prerender, mas estava sendo anulada pelo plugin Cloudflare.

**Fix:** [`Frontend-chatbot/vite.config.ts`](../Frontend-chatbot/vite.config.ts):
```ts
export default defineConfig({
  cloudflare: false,                     // desabilita Workers build
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: { outputPath: "/index" },  // gera dist/client/index.html
    },
  },
  // ... resto
});
```

**Validação:** `[prerender] Prerendered 1 pages: /` no log do build, `find /dist -name index.html` retorna o caminho.

### 2. `outputPath: "/"` gerava `.html` (sem nome)
**Sintoma:** Após habilitar SPA, o shell foi salvo como `.html` (arquivo oculto, sem prefixo) em vez de `index.html`.

**Causa:** outputPath é concatenado com `.html` direto — `"/"` → `"/.html"`.

**Fix:** trocar pra `outputPath: "/index"`.

### 3. Mount aninhado em path read-only
**Sintoma:** `nginx` crash com `read-only file system` ao tentar montar `frontend_manifests` em `/usr/share/nginx/html/manifests` (subpath de volume `:ro`).

**Causa:** Docker não permite mount aninhado quando o parent é read-only.

**Fix:** Layout flat — Dockerfile do front copia `dist/client/*` (que já contém `manifests/` e `icons/`) direto pra `/srv/html`. Volumes `frontend_manifests` e `frontend_icons` foram removidos do compose; só sobra `frontend_dist`. nginx monta `frontend_dist:/usr/share/nginx/html:ro` sem aninhamento.

**Arquivos modificados:**
- [`Frontend-chatbot/Dockerfile`](../Frontend-chatbot/Dockerfile) — CMD copia `dist/client/.` pra `/srv/html`
- [`docker-compose.yml`](../docker-compose.yml) — só `frontend_dist`, sem manifests/icons separados

### 4. Network `helpdesk_network` conflito entre dev e prod
**Sintoma:** `docker compose -f docker-compose.yml down` falha com `network has active endpoints` quando containers de outro stack usam a mesma rede nomeada.

**Fix:** Marcar rede como `external: true` no compose prod — ambiente compartilhado, gerenciado fora do compose.

```yaml
networks:
  helpdesk_network:
    name: helpdesk_network
    external: true
```

---

## ⚠️ Não validado (e por quê)

### Backend prod conectando ao DB do dev
**Sintoma:** backend prod falha em loop com `Error: P3009 — migrate found failed migrations` e depois `column users.status does not exist`.

**Causa:** o DB do `helpdesk_postgres` (dev) tem 24 migrations registradas com `started_at NOT NULL AND finished_at IS NULL` (estado "failed") de tentativas anteriores que quebraram. O Prisma client buildado no backend prod espera schema mais novo. Marcar as failed como completed na tabela `_prisma_migrations` desbloqueia o `migrate deploy`, mas o schema real não foi alterado, então `User.status` não existe.

**Por que não é bloqueio de prod real:**
- Deploy num host **limpo** roda `prisma migrate deploy` do zero: aplica TODAS as 24 migrations em ordem contra DB vazio. Não tem estado prévio "failed".
- O problema é específico do meu ambiente local onde dev+prod compartilham `postgres_data` há 11 dias.

**Pra reproduzir clean:**
```bash
docker compose -f docker-compose.yml down -v   # remove volumes
docker compose -f docker-compose.yml up -d postgres
# aguarda healthy
docker compose -f docker-compose.yml up -d backend  # migrate deploy roda em DB vazio → sucesso
```

### Hermes container completo
Timeout puxando `node:20-alpine` da registry (rede ruim no momento). Image dev preexistente foi reutilizada, mas o rebuild fresh do hermes prod não foi testado. Hermes em si depende mais de `python:3.11-slim` (no Dockerfile do submodule) que `node:20-alpine` (do hermes-tools).

---

## 📝 Aprendizados pra DEPLOY_PRODUCAO.md

Atualizações importantes ao [docs/DEPLOY_PRODUCAO.md](DEPLOY_PRODUCAO.md):

1. **E2 (arquivos):** documentar que `vite.config.ts` precisa `cloudflare: false` + `tanstackStart.spa` setado — sem isso build SSR fica incompatível com nginx estático.
2. **E4 (sequência):** rodar `docker network create helpdesk_network` no E1 (host setup) ANTES de qualquer `docker compose up`, já que prod usa rede external.
3. **E1 (pré-requisitos):** adicionar item "DB postgres vazio ou com `_prisma_migrations` consistente — se importar dump do dev, validar com `SELECT * FROM _prisma_migrations WHERE finished_at IS NULL`".

---

## 🚦 Próximos passos pra deploy real

1. Provisionar host com `docker network create helpdesk_network`
2. Clone do repo + `git submodule update --init --recursive`
3. Clone do `Frontend-chatbot` dentro do Chatbot
4. Configurar `.env` (especialmente VAPID, JWT_SECRET, senhas)
5. Gerar/instalar cert wildcard em `nginx/certs/`
6. `docker compose -f docker-compose.yml build` (todas as imagens)
7. `docker compose -f docker-compose.yml up -d postgres redis rabbitmq` + aguardar healthy
8. `docker compose -f docker-compose.yml up -d backend` — migrate deploy roda do zero
9. `docker compose -f docker-compose.yml up -d hermes hermes-tools frontend nginx`
10. Smoke E5 do [DEPLOY_PRODUCAO.md](DEPLOY_PRODUCAO.md#e5--smoke-pós-deploy)
