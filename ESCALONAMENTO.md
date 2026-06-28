# Escalonamento horizontal — diagnóstico e plano

> Status: **diagnóstico** (não implementado). Decisão 2026-06-10: documentar por ora.
> O backend hoje roda como **instância única**. Rodar N réplicas **quebra** sem as mudanças abaixo.

## TL;DR

| Componente | Escala horizontal hoje? | Por quê |
|------------|:----------------------:|---------|
| API REST (stateless) | ✅ quase | JWT stateless, sem sessão em memória |
| WhatsApp (Baileys) | ❌ **não** | 1 sessão por número; N réplicas = N dispositivos brigando |
| Cron jobs (`@Cron`/`@Interval`) | ❌ **não** | rodam em toda réplica → trabalho duplicado |
| WebSocket (Socket.IO) | ❌ **não** | sem Redis adapter → evento não cruza réplicas |
| SLA timers | ✅ | já usam Redis |

## Blocos concretos no código

### 1. Baileys inicia em toda réplica
[baileys.service.ts:63-68](backend/src/infrastructure/whatsapp/baileys.service.ts#L63-L68) — `onModuleInit()` → `connect()`.
Cada réplica abriria uma conexão WhatsApp com a **mesma** sessão → o WhatsApp derruba conexões concorrentes (multi-device com conflito). **O bot precisa rodar em exatamente 1 processo.**

### 2. Cron jobs duplicados
6 pontos com agendadores que disparariam em **cada** réplica:
- [sla-breach.job.ts](backend/src/infrastructure/jobs/sla-breach.job.ts) — escalonamento de SLA
- [data-retention.job.ts](backend/src/infrastructure/jobs/data-retention.job.ts) — purga LGPD (delete!)
- [sla.service.ts](backend/src/presentation/controllers/sla/sla.service.ts)
- [agent-metrics.service.ts](backend/src/presentation/controllers/agent-metrics/agent-metrics.service.ts)
- registrados via `ScheduleModule` em [app.module.ts](backend/src/app.module.ts) e [services.module.ts](backend/src/infrastructure/services/services.module.ts)

N réplicas = N execuções → emails/escalonamentos em duplicata e deletes de retenção repetidos.

### 3. Socket.IO sem Redis adapter
Não há `@socket.io/redis-adapter` no projeto. Com N réplicas, um evento emitido pela réplica A **não chega** ao cliente conectado na réplica B → tempo-real (chat, status) quebra.

## Plano recomendado — flag de papel (`WORKER_MODE`)

Menos invasivo: **mesma imagem Docker**, comportamento muda por env var.

```
                 nginx (upstream + sticky p/ WebSocket)
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼              ▼
  api (N réplicas, stateless)        worker (1 réplica)
  WORKER_MODE=false                  WORKER_MODE=true
  • HTTP + WebSocket                 • Baileys (WhatsApp)
  • Baileys OFF                      • Cron jobs
  • Cron OFF                         • consumer outgoing_messages
       └──────── Redis pub/sub (Socket.IO adapter) ────────┘
```

### Etapas

1. **Env `WORKER_MODE`** (default `false`).
2. **Gatear Baileys**: em [baileys.service.ts](backend/src/infrastructure/whatsapp/baileys.service.ts) `onModuleInit` só conecta se `WORKER_MODE=true`. Idem o consumer de `outgoing_messages`.
3. **Gatear crons**: registrar os 6 jobs apenas quando `WORKER_MODE=true` (ou usar lock distribuído Redis `SET NX` por job, alternativa se quiser cron na API).
4. **Socket.IO Redis adapter**: instalar `@socket.io/redis-adapter` + `ioredis`, criar `RedisIoAdapter` e plugar em `main.ts` (`app.useWebSocketAdapter`). Vale p/ api **e** worker.
5. **nginx**: `upstream` com as réplicas de API + `ip_hash` (ou `sticky`) p/ WebSocket; worker **fora** do upstream HTTP.
6. **compose**: serviço `backend` (deploy.replicas: N, `WORKER_MODE=false`) + serviço `worker` (1 réplica, `WORKER_MODE=true`, mesma imagem). Garantir que `whatsapp_sessions` monte só no worker.

### Riscos / atenção
- **Sessão Baileys** (`whatsapp_sessions`) é estado de 1 processo — nunca montar em mais de uma réplica.
- **Sticky sessions** são obrigatórias p/ Socket.IO mesmo com Redis adapter (handshake).
- `data-retention.job` faz **delete** — garantir que rode em 1 lugar só (worker) para não duplicar.
- Idempotência WhatsApp (Redis, TTL 24h) já protege contra reprocessamento de inbound.

### Alternativa (se não quiser worker dedicado)
Manter monólito e usar **lock distribuído Redis** por job + eleição de líder p/ o Baileys. Mais simples de operar (1 serviço), porém concentra o ponto único do WhatsApp num líder eleito — mais código de coordenação. O `WORKER_MODE` é mais explícito e previsível.

## Esforço estimado
~1 sprint: 4-6h Socket.IO adapter, 2-3h gating Baileys/cron, 2-3h compose/nginx, + teste de carga multi-réplica.
