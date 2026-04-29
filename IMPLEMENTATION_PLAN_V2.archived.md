# 📋 Plano de Implementação: Arquitetura Multi-Frontend

> Atualizado: 2026-04-26

---

## 1. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS + Prisma)                        │
│   Auth (SSO/JWT) │ Tickets │ Stock │ Purchases │ PurchaseRequests      │
└─────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   FRONTEND TI   │  │ FRONTEND ELÉTR  │  │ FRONTEND COMPRAS│
│  support-mobile │  │  suport-eletric │  │ support-compras │
│  (Chatwoot)     │  │    (Gold)       │  │    (Green)      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                    Hermes Agent (WhatsApp Bot)
```

---

## 2. Repositórios

| Repositório | Branch | Foco | Tema | Status |
|-------------|--------|------|------|--------|
| `support-mobile` | `feature/frontend-ti` | Técnicos TI | Chatwoot-style (dark) | Em desenvolvimento |
| `suport-eletric` | `main` | Electrical (NR-10) | Gold (#FFC700) | Existente |
| `support-compras` | **NOVO** | Compras/Requisições | Verde (#22C55E) | **Pendente criar** |

---

## 3. Backend - Melhorias Necessárias

### 3.1 Adicionar Filtro Setor em Tickets

**Problema:** Tickets não são filtrados por setor no backend.

**Solução:** Adicionar filtro `sector` no `TicketsController.findAll()`:

```typescript
// GET /tickets?sector=TI&status=NEW
// O frontend TI só vê tickets TI, elétrica só vê elétricos
```

### 3.2 Modelo PurchaseRequest (Requisição de Compra)

**Problema:** Sistema atual só registra compras feitas, não requisições.

**Solução:** Criar novo modelo:

```prisma
model PurchaseRequest {
  id             String   @id @default(uuid())
  ticketId       String?  // Ticket relacionado (opcional)
  sector         String   // TI ou ELECTRIC (setor solicitante)

  // Item solicitado
  itemName       String
  category       EquipmentCategory
  quantity       Int      @default(1)
  justification  String?

  // Status do workflow
  status         RequestStatus @default(PENDING)
  // PENDING → APPROVED → PURCHASED → DELIVERED
  //         → REJECTED

  // Aprovação
  requestedById  String
  approvedById   String?
  approvedAt     DateTime?
  rejectedReason String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum RequestStatus {
  PENDING     // Aguardando aprovação
  APPROVED    // Aprovada → pode comprar
  REJECTED    // Rejeitada
  PURCHASED   // Compra realizada
  DELIVERED   // Entregue ao solicitante
  CANCELLED   // Cancelada
}
```

### 3.3 Roles e Permissões

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  permissions Json     // ["tickets:read:ti", "compras:approve"]
  users       User[]
}

model User {
  // ... existing fields
  roleId      String?
  role        Role?    @relation(fields: [roleId], references: [id])
}
```

### 3.4 Endpoints REST

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| GET | `/tickets?sector=TI\|ELECTRIC` | Lista filtrada | TI→TI, ELÉTR→ELÉTR |
| POST | `/purchase-requests` | Criar requisição | TI, ELÉTR |
| GET | `/purchase-requests` | Lista todas | COMPRAS |
| PATCH | `/purchase-requests/:id/approve` | Aprovar | COMPRAS |
| PATCH | `/purchase-requests/:id/reject` | Rejeitar | COMPRAS |
| POST | `/purchases` | Registrar compra | COMPRAS |

---

## 4. Fluxo de Requisição de Compra

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Técnico    │     │    Bot/     │     │  Frontend  │     │  Compras   │
│  (TI/ELÉTR)│     │   Hermes   │     │   TI/ELÉTR  │     │            │
└─────┬───────┘     └─────┬───────┘     └──────┬──────┘     └──────┬──────┘
      │                   │                    │                    │
      │ 1. Ticket criado │                    │                    │
      │                   │                    │                    │
      │                   │                    │ 2. Cria PurchaseRequest │
      │                   │                    │    POST /purchase-requests │
      │                   │                    │                    │
      │                   │                    │                    │ 3. Notificação
      │                   │                    │                    │    WebSocket
      │                   │                    │                    │
      │                   │                    │                    │ 4. Aprova/Rejeita
      │                   │                    │                    │
      │                   │                    │ 5. Notifica técnico │
      │                   │                    │                    │
```

---

## 5. Frontend TI (`feature/frontend-ti`)

### 5.1 Funcionalidades
- [ ] Tickets TI filtrados (`sector=TI`)
- [ ] Chat WhatsApp via Hermes
- [ ] Dashboard com métricas TI
- [ ] Gestão de Stock TI (`stockType=TI`)
- [ ] FAQ/KB
- [ ] Admin (users, groups, AI config)

### 5.2 Tema (Chatwoot-style)
```css
--cw-primary: #1F93FF;
--cw-accent: #00E0FF;
--cw-bg: #11151C;
--cw-surface: #1A1F26;
```

---

## 6. Frontend Elétrica (`suport-eletric`)

### 6.1 Funcionalidades
- [ ] Tickets ELÉTRICA filtrados (`sector=ELECTRIC`)
- [ ] Safety Checklist (NR-10/NR-35/LOTO)
- [ ] Tool Loans
- [ ] Chat com Hermes (AI especialista elétrico)
- [ ] Dashboard
- [ ] Stock ELÉTRICA (`stockType=ELECTRIC`)

### 6.2 Tema (Gold/Yellow)
```css
--primary: #FFC700;
--accent: #FF8C00;
--bg: #11151C;
```

---

## 7. Frontend Compras (`support-compras` - NOVO)

### 7.1 Funcionalidades
- [ ] Lista de PurchaseRequests (todas)
- [ ] Workflow de aprovação (approve/reject)
- [ ] Registro de Purchases
- [ ] Relatórios (por setor, mês, categoria)
- [ ] Dashboard compras
- [ ] Gestão de fornecedores

### 7.2 Tema (Green)
```css
--primary: #22C55E;
--accent: #10B981;
--bg: #11151C;
```

### 7.3 Telas
| Tela | Descrição |
|------|-----------|
| `/login` | SSO centralizado |
| `/requisitions` | Lista de requisições |
| `/requisitions/:id` | Detalhes + ações |
| `/purchases` | Registro de compras |
| `/reports` | Relatórios |
| `/suppliers` | Gestão fornecedores |
| `/settings` | Configurações |

---

## 8. Implementação - Ordem de Tarefas

### Fase 1: Backend (SEMANA 1)
- [ ] Adicionar filtro `sector` em `GET /tickets`
- [ ] Criar migration `PurchaseRequest`
- [ ] Criar CRUD endpoints PurchaseRequest
- [ ] Criar endpoints approve/reject
- [ ] Implementar SectorGuard
- [ ] Criar Roles básicas (admin_ti, admin_electric, compras)

### Fase 2: Hermes + WhatsApp (SEMANA 1-2)
- [ ] Configurar Hermes no docker-compose.dev
- [ ] Criar skill `helpdesk-conversation`
- [ ] Configurar Baileys bridge
- [ ] Configurar MiniMax como provider
- [ ] Testar fluxo conversacional

### Fase 3: Frontend TI (SEMANA 2)
- [ ] Branch `feature/frontend-ti` do support-mobile
- [ ] Configurar API sector=TI
- [ ] Testar filtros
- [ ] Ajustar dashboard

### Fase 4: Frontend Elétrica (SEMANA 2-3)
- [ ] Adaptar do codebase existente
- [ ] Configurar API sector=ELECTRIC
- [ ] Aplicar tema gold
- [ ] Testar Safety Checklist

### Fase 5: Frontend Compras (SEMANA 3-4)
- [ ] Criar repo support-compras
- [ ] Clone do support-mobile como base
- [ ] Implementar views de requisição
- [ ] Workflow de aprovação
- [ ] Tema verde
- [ ] Dashboard compras

### Fase 6: Integração (SEMANA 4)
- [ ] WebSocket notifications
- [ ] Testar fluxo TI → Compras
- [ ] Testar fluxo ELÉTR → Compras
- [ ] Documentação

---

## 9. Variáveis de Ambiente

```bash
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=...
HERMES_API_KEY=...

# Frontend TI
VITE_API_URL=https://api-ti.helpdeskmsm.com.br
VITE_SECTOR=TI

# Frontend Elétrica
VITE_API_URL=https://api-electric.helpdeskmsm.com.br
VITE_SECTOR=ELECTRIC

# Frontend Compras
VITE_API_URL=https://api-compras.helpdeskmsm.com.br
VITE_SECTOR=COMPRAS
```

---

## 10. Dependências Entre Tarefas

```
Fase 1 (Backend)
    │
    ├──► Fase 2 (Hermes) pode começar
    │
    ├──► Fase 3 (Frontend TI) depende de: tickets com sector filter
    │
    ├──► Fase 4 (Frontend ELÉTR) depende de: tickets com sector filter
    │
    └──► Fase 5 (Frontend COMPRAS) depende de: PurchaseRequest pronto
              │
              └──► Fase 6 (Integração) depende de: todos prontos
```

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Hermes não conecta no WhatsApp | Média | Alto | Usar sessão persistida + QR recovery |
| Conflito de sessão WhatsApp | Alta | Alto | Hermes e bot atual nunca rodam juntos |
| Frontend Compras muito diferente | Média | Médio | Compartilhar componentes do base |
| Performance com 3 frontends | Baixa | Médio | Cache Redis + indexação correta |

---

## 12. Estimativa de Esforço

| Fase | Tarefa | Estimativa |
|------|--------|------------|
| 1 | Backend (sector + PurchaseRequest) | 1 semana |
| 2 | Hermes + WhatsApp | 1-2 semanas |
| 3 | Frontend TI | 3-4 dias |
| 4 | Frontend Elétrica | 1 semana |
| 5 | Frontend Compras | 1-2 semanas |
| 6 | Integração | 3-4 dias |
| **Total** | | **5-7 semanas** |

---

## 13. Status Atual

### ✅ Implementado (neste repo)
- Backend com Prisma (45+ models)
- Auth JWT com sector
- Tickets, Stock, Purchases
- WebSocket events
- Docker compose com backend + infra

### ✅ Hermes Integration (neste repo)
- `docker-compose.dev.yml` com serviço hermes
- Skill `helpdesk-conversation/SKILL.md`
- Bridge `hermes-integration/backend-tools/server.js`
- Config em `hermes-integration/config/`

### 🔄 Em Progresso
- Hermes Agent como brain conversacional (setup inicial feito)

### ⏳ Pendente
- Backend: filtro sector, PurchaseRequest, Roles
- Frontend TI: configuração setorial
- Frontend Elétrica: adaptação
- Frontend Compras: criar do zero
- Integração: WebSocket cross-app

---

## 14. Quick Start - Próximos Passos

```bash
# 1. Backend - Adicionar filtro sector em tickets
# Editar: backend/src/presentation/controllers/tickets/tickets.controller.ts

# 2. Backend - Criar PurchaseRequest
cd backend
npx prisma migrate dev --name add_purchase_request

# 3. Hermes - Testar conversation
docker compose -f docker-compose.dev.yml up -d hermes hermes-tools
docker logs -f helpdesk_hermes

# 4. Frontend TI - Configurar sector=TI no suporte-mobile
```