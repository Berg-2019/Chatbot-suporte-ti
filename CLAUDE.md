# CLAUDE.md — Chatbot-suporte-ti

> Instruções para o Claude Code trabalhar neste projeto.
> Última atualização: 2026-02-19

---

## 🎯 Sobre o Projeto

Sistema de helpdesk integrado ao WhatsApp para suporte técnico de TI, com painel administrativo e integração ao GLPI. O projeto é um **monorepo** com 3 serviços principais + infraestrutura.

**Domínio:** Helpdesk de TI corporativo — abertura, acompanhamento e resolução de chamados técnicos via WhatsApp, com gestão de estoque de equipamentos, reservas e base de conhecimento (FAQ).

**Repositório:** https://github.com/Berg-2019/Chatbot-suporte-ti
**Branch principal de desenvolvimento:** `develop`
**Produção:** https://helpdeskmsm.com.br

---

## 🏗️ Arquitetura

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  WhatsApp   │───▶│    Bot      │───▶│   Backend   │
│  (Baileys)  │    │  (Node.js)  │    │  (NestJS)   │
└─────────────┘    └──────┬──────┘    └──────┬──────┘
                          │                   │
                   ┌──────▼──────┐    ┌──────▼──────┐
                   │   Redis     │    │ PostgreSQL  │
                   │  (Sessões)  │    │  (Prisma)   │
                   └─────────────┘    └─────────────┘
                                             │
                   ┌─────────────┐    ┌──────▼──────┐
                   │  RabbitMQ   │    │    GLPI     │
                   │  (Filas)    │    │  (Tickets)  │
                   └─────────────┘    └─────────────┘
                                             │
                   ┌─────────────┐           │
                   │  Frontend   │───────────┘
                   │  (Next.js)  │
                   └─────────────┘
```

### Portas

| Serviço | Dev | Produção (via Nginx) |
|---------|-----|----------------------|
| Backend | 3000 (debug: 9229) | https://helpdeskmsm.com.br/api |
| Frontend | 3001 | https://helpdeskmsm.com.br |
| Bot | 3002 | Interno |
| GLPI | 8080 | https://glpi.helpdeskmsm.com.br |
| RabbitMQ | 15672 | 15672 |
| PostgreSQL | 5432 | Interno |
| Redis | 6379 | Interno |

---

## 📁 Estrutura do Projeto

```
Chatbot-suporte-ti/
├── backend/                 # API NestJS (Clean Architecture)
│   ├── src/
│   │   ├── domain/          # Entities, DTOs, interfaces
│   │   ├── infrastructure/  # Database, External APIs (GLPI, Redis)
│   │   └── presentation/    # Controllers, Gateways (WebSocket)
│   ├── prisma/
│   │   └── schema.prisma    # ⚠️ Fonte da verdade para o banco
│   └── package.json
│
├── frontend/                # Interface Next.js + React
│   ├── app/
│   │   ├── admin/           # Painel administrativo
│   │   ├── dashboard/       # Dashboard técnicos
│   │   └── login/           # Autenticação
│   └── components/          # Componentes reutilizáveis
│
├── bot/                     # Bot WhatsApp (Baileys)
│   └── src/
│       ├── handlers/
│       │   └── flow-handler.js  # ⚠️ Fluxos de conversação (máquina de estados)
│       └── services/        # GLPI service, RabbitMQ service, Redis service
│
├── intent-service/          # (Futuro) Serviço de NLU
├── nginx/                   # Configs do proxy reverso
├── docs/                    # Documentação do projeto
│
├── docker-compose.yml       # Produção
├── docker-compose.dev.yml   # Dev com hot-reload
├── helpdesk.sh              # Script de gerenciamento
├── .env.example             # Template de variáveis
│
├── CLAUDE.md                # ← ESTE ARQUIVO
├── FEATURE_ABSORPTION_PLAN.md  # Plano de absorção de features
├── IMPLEMENTATION_PLAN_V2.md   # Plano V2 de implementação
└── GUIA_DE_TESTES.md        # Guia de testes
```

---

## 🛠️ Stack Técnica

### Backend
- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma
- **Banco:** PostgreSQL
- **Cache/Sessões:** Redis
- **Fila:** RabbitMQ (AMQP)
- **Autenticação:** JWT
- **Arquitetura:** Clean Architecture (domain → infrastructure → presentation)

### Frontend
- **Framework:** Next.js (React)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS (preferido) ou CSS Modules
- **Gráficos:** Recharts (para dashboards)
- **HTTP Client:** Axios ou fetch nativo
- **Estado:** React Context + hooks (sem Redux)

### Bot
- **Runtime:** Node.js
- **WhatsApp:** @whiskeysockets/baileys
- **Sessões:** Redis (estado da conversa por telefone)
- **Filas:** RabbitMQ (mensagens assíncronas)
- **Fluxos:** Máquina de estados em flow-handler.js

### Infra
- **Containers:** Docker + Docker Compose
- **Proxy:** Nginx (SSL, rate limiting)
- **Host:** Proxmox (VMs)
- **ITSM:** GLPI (API REST)

---

## 📐 Convenções de Código

### Geral
- **Idioma do código:** Inglês (variáveis, funções, classes, commits)
- **Idioma do conteúdo/UI:** Português brasileiro (mensagens, labels, textos)
- **Indentação:** 2 espaços
- **Ponto e vírgula:** Sim (TypeScript)
- **Aspas:** Aspas simples no TS/JS, aspas duplas no JSON
- **Linha em branco:** Uma linha entre blocos lógicos
- **Imports:** Agrupados (libs externas primeiro, depois internos)

### Backend (NestJS)

```typescript
// Padrão de nomes
// Controllers: kebab-case no arquivo, PascalCase na classe
// tickets.controller.ts → TicketsController
// Services: tickets.service.ts → TicketsService
// DTOs: create-ticket.dto.ts → CreateTicketDto
// Entities: ticket.entity.ts → Ticket

// Padrão de Controller
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async findAll(@Query() query: FindTicketsQueryDto) {
    return this.ticketsService.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateTicketDto, @Req() req) {
    return this.ticketsService.create(dto, req.user);
  }
}

// Padrão de Service
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private glpiService: GlpiService,
  ) {}

  async findAll(query: FindTicketsQueryDto) {
    // Usar Prisma para queries
    return this.prisma.ticket.findMany({
      where: { /* ... */ },
      include: { /* ... */ },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

**Regras do backend:**
- Toda query ao banco via Prisma (nunca SQL raw, exceto em casos de performance extrema)
- DTOs com class-validator para validação de entrada
- Errors lançar HttpException ou classes custom que estendam HttpException
- Logs com this.logger (não console.log)
- Endpoints seguem REST: GET (listar/buscar), POST (criar), PATCH (atualizar parcial), DELETE (remover)
- Paginação: `?page=1&limit=20` com resposta `{ data: [], meta: { total, page, limit, totalPages } }`
- Datas sempre em UTC no banco, conversão para timezone no frontend

### Frontend (Next.js / React)

```typescript
// Padrão de componente
// Nomes: PascalCase
// Arquivo: PascalCase.tsx (ou kebab-case.tsx para pages)
// Hooks custom: use-*.ts

// Componente funcional com TypeScript
interface TicketCardProps {
  ticket: Ticket;
  onSelect?: (id: string) => void;
}

export function TicketCard({ ticket, onSelect }: TicketCardProps) {
  // hooks primeiro
  const [isLoading, setIsLoading] = useState(false);

  // handlers
  const handleClick = () => {
    onSelect?.(ticket.id);
  };

  // render
  return (
    <div className="rounded-lg border p-4 hover:shadow-md transition-shadow">
      {/* conteúdo */}
    </div>
  );
}
```

**Regras do frontend:**
- Componentes funcionais (nunca classes)
- TypeScript interfaces para props (não types, exceto unions)
- Tailwind CSS para estilização (não styled-components, não CSS-in-JS)
- Fetch de dados com hooks customizados ou diretamente em Server Components
- Estado global via React Context (AuthContext, ThemeContext, etc.)
- Formulários com react-hook-form + zod para validação
- Toasts com sonner ou react-hot-toast para feedback
- Loading states: skeleton ou spinner, nunca tela em branco
- Responsivo: mobile-first com breakpoints Tailwind (sm, md, lg, xl)

### Bot (Node.js)

```javascript
// Padrão do bot
// Handlers: flow-handler.js contém a máquina de estados
// Services: glpi-service.js, redis-service.js, rabbitmq-service.js
// Estados: STATES enum/object com todos os estados possíveis

// Padrão de handler
async handleMessage(sock, from, text, msg) {
  const phone = from.split('@')[0];
  const session = await redisService.getSession(phone);

  switch (session.state) {
    case STATES.MAIN_MENU:
      return this.handleMainMenu(sock, from, text, session);
    case STATES.TICKET_DESCRIPTION:
      return this.handleTicketDescription(sock, from, text, session);
    // ...
  }
}

// Padrão de envio de mensagem
async sendMessage(sock, to, text) {
  await sock.sendMessage(to, { text });
}
```

**Regras do bot:**
- Toda sessão de conversa salva no Redis com TTL
- Estado da conversa = chave no Redis com phone como identificador
- Mensagens do bot sempre em português, tom profissional mas amigável
- Emojis: usar com moderação, apenas em pontos-chave (✅ ❌ 📋 🔧)
- Sempre oferecer opção de voltar/cancelar nos fluxos
- Timeout de sessão: 30 minutos de inatividade

### Prisma Schema

```prisma
// Convenções do schema
// - Model: PascalCase singular (Ticket, User, Contact)
// - Campo: camelCase (createdAt, assignedTo)
// - Enum: UPPER_SNAKE_CASE (TICKET_STATUS, USER_ROLE)
// - Relação: nome descritivo (assignedTo, createdBy)
// - Índices: nos campos mais consultados
// - Soft delete: usar deletedAt DateTime? (quando necessário)

model Ticket {
  id          String   @id @default(uuid())
  title       String
  description String
  status      TicketStatus @default(OPEN)
  priority    Priority     @default(MEDIUM)

  // Relações
  assignedToId String?
  assignedTo   User?    @relation("AssignedTickets", fields: [assignedToId], references: [id])
  createdById  String
  createdBy    User     @relation("CreatedTickets", fields: [createdById], references: [id])

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Índices
  @@index([status])
  @@index([assignedToId])
  @@index([createdAt])
}
```

---

## 🔄 Workflow de Desenvolvimento

### Branches
- `main` — Produção estável
- `develop` — Branch de desenvolvimento (base para features)
- `feature/*` — Novas funcionalidades
- `fix/*` — Correções de bugs
- `hotfix/*` — Correções urgentes em produção

### Comandos úteis

```bash
# Gerenciamento via script
./helpdesk.sh dev          # Iniciar dev com hot-reload
./helpdesk.sh prod         # Iniciar produção
./helpdesk.sh stop         # Parar tudo
./helpdesk.sh logs [serv]  # Ver logs
./helpdesk.sh migrate      # Rodar migrations Prisma
./helpdesk.sh shell <serv> # Acessar shell do container

# Prisma
cd backend
npx prisma migrate dev --name nome_da_migration
npx prisma generate
npx prisma studio  # GUI para o banco

# NestJS
cd backend
npm run start:dev   # Dev com watch
npm run build       # Build produção
npm run test        # Testes

# Frontend
cd frontend
npm run dev         # Dev server
npm run build       # Build produção

# Bot
cd bot
npm run dev         # Dev com nodemon
```

### Ao criar uma nova feature, SEMPRE:
1. Criar model no Prisma se envolver dados novos
2. Rodar migration: `npx prisma migrate dev --name add_feature_name`
3. Criar DTO com validação (class-validator)
4. Criar Service com lógica de negócio
5. Criar Controller com endpoints REST
6. Criar componentes React no frontend
7. Testar manualmente os fluxos completos
8. Atualizar este CLAUDE.md se mudar convenções

---

## 📋 Plano de Evolução Ativo

### Documentos de referência
- **IMPLEMENTATION_PLAN_V2.md** — Sprints do V2 (segurança, performance, UX)
- **FEATURE_ABSORPTION_PLAN.md** — Features absorvidas de Chatwoot, Peppermint, Typebot

### Prioridades atuais (em ordem)

#### 🔴 Crítico — Fase 1: Fundação
1. **RBAC com roles customizáveis** — Model Role com permissões granulares JSON, RolesGuard atualizado, UI de gerenciamento
2. **Model Contact unificado** — Perfil do cliente com histórico, custom attributes, sidebar no chat
3. **Sistema de Webhooks de saída** — Models Webhook + WebhookLog, trigger em eventos, HMAC signature
4. **Respostas Prontas (Canned Responses)** — Model, CRUD, dropdown no chat com trigger `/`

#### 🟡 Importante — Fase 2: Automação
5. **Engine de Automação** — AutomationRule (event→conditions→actions), integrado em tickets/messages
6. **Auto-atribuição de agentes** — Round-robin ou por disponibilidade, integrado à automação
7. **CSAT (Pesquisa de Satisfação)** — Model CsatResponse, fluxo no bot, relatório no dashboard
8. **Notas internas + @mentions** — Campo isInternal em Message, visual diferenciado, notificação

#### 🟢 Evolução — Fase 3: Intelligence
9. **Métricas por agente** — First Response Time, Resolution Time, CSAT médio, ranking
10. **Labels/Tags em tickets** — Model TicketLabel, filtros, relatórios por label
11. **Tempo médio de resposta/resolução** — Cálculos automáticos, widget no dashboard
12. **Intent Detection via LLM** — Classificação simples como fallback do menu numerado

### Melhorias de UI pendentes (do roteiro de melhorias)
- Ícone do WhatsApp nos cards de chamados (indicar canal de origem)
- Corrigir quebras de texto/truncamento em nomes e descrições
- Cores por área/setor (badges, ícones, paleta definida)
- Alinhar inputs e componentes de formulário
- Filtros avançados: status, área, técnico, origem, busca full-text

### Melhorias do bot pendentes
- Mensagens padronizadas (confirmação, erro, encerramento, handoff)
- Handoff para humano com contexto completo (histórico anexado)
- Coleta estruturada de dados (categoria, impacto, sistema afetado, anexos)
- Consulta de status pelo WhatsApp ("status 1234")
- Mini-FAQ automatizado (5-10 perguntas mais frequentes)

---

## 🎨 Design Reference: Chatwoot (Caminho A)

Estamos absorvendo o design e UX do Chatwoot, **não** integrando o sistema. A abordagem é:

1. **Estudar componentes Vue do Chatwoot** (repo: github.com/chatwoot/chatwoot)
2. **Recriar em React/Next.js** adaptando ao nosso backend NestJS
3. **Manter 100% controle** sobre código e UX

### Componentes prioritários para recriar

| Componente Chatwoot | Localização no repo Chatwoot | Nosso equivalente |
|---|---|---|
| ConversationList | `app/javascript/dashboard/components/ChatList/` | `frontend/components/ConversationList.tsx` |
| ChatView (bolhas) | `app/javascript/dashboard/components/widgets/conversation/` | `frontend/components/ChatView.tsx` |
| ContactPanel (sidebar) | `app/javascript/dashboard/routes/dashboard/contacts/` | `frontend/components/ContactSidebar.tsx` |
| CSAT Reports | `app/javascript/dashboard/routes/dashboard/settings/reports/` | `frontend/app/admin/reports/csat/` |
| Automation Rules | `app/javascript/dashboard/routes/dashboard/settings/automation/` | `frontend/app/admin/automation/` |
| Canned Responses | `app/javascript/dashboard/routes/dashboard/settings/canned/` | `frontend/app/admin/canned-responses/` |
| Agent Reports | `app/javascript/dashboard/routes/dashboard/settings/reports/` | `frontend/app/admin/reports/agents/` |

### Padrão visual a seguir
- **Layout:** Sidebar esquerda (conversas) + área central (chat) + sidebar direita (detalhes do contato)
- **Cores:** Clean, minimalista. Azul primário, cinza para backgrounds, badges coloridos por status/área
- **Tipografia:** Inter ou system fonts. 14px base, 12px para metadata
- **Ícones:** Lucide React (já disponível) ou Heroicons
- **Feedback:** Toast para ações, skeleton para loading, empty states com ilustração
- **Responsivo:** Sidebar esquerda colapsa em mobile, chat ocupa tela toda

---

## ⚠️ Regras Importantes

### NUNCA fazer:
- Hardcode de credenciais ou tokens (sempre .env)
- Console.log em produção (usar Logger do NestJS)
- Any no TypeScript (tipar tudo, interfaces para tudo)
- SQL raw sem necessidade extrema (usar Prisma)
- Instalar dependências sem verificar se já existe similar no projeto
- Modificar schema.prisma sem criar migration
- Commitar node_modules, .env, ou arquivos de build
- Usar var (sempre const/let)
- Criar componentes classe no React

### SEMPRE fazer:
- Validar input com DTOs (backend) e zod/react-hook-form (frontend)
- Tratar erros com try/catch e retornar mensagens amigáveis
- Adicionar @@index no Prisma para campos usados em WHERE/ORDER BY
- Manter logs estruturados com contexto (ticketId, userId, action)
- Verificar permissões antes de executar ações (RolesGuard)
- Retornar paginação em listagens
- Usar transações Prisma quando múltiplas operações dependem uma da outra
- Manter o .env.example atualizado quando adicionar nova variável

---

## 🔑 Variáveis de Ambiente Essenciais

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/helpdesk

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@localhost:5672

# JWT
JWT_SECRET=...

# GLPI
GLPI_URL=http://localhost:8080/apirest.php
GLPI_APP_TOKEN=...
GLPI_USER_TOKEN=...

# Frontend
NEXT_PUBLIC_API_URL=https://bk.helpdeskmsm.com.br

# (Futuro) LLM para Intent Detection
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...

# (Futuro) Email Ingestion
# SUPPORT_EMAIL_USER=...
# SUPPORT_EMAIL_PASS=...
# SUPPORT_EMAIL_HOST=...
```

---

## 📌 Quick Reference para o Claude Code

Quando receber um pedido, siga esta ordem:

1. **Ler contexto:** Entender o que já existe antes de criar algo novo
2. **Prisma primeiro:** Se envolve dados novos, começar pelo schema
3. **Backend depois:** Service → Controller → DTO
4. **Frontend por último:** Componentes que consomem os endpoints criados
5. **Bot quando aplicável:** Atualizar flow-handler.js se a feature impacta o WhatsApp

Para cada feature do FEATURE_ABSORPTION_PLAN.md, seguir o checklist documentado lá.

Quando em dúvida sobre padrões, olhar os arquivos existentes no projeto e seguir o mesmo padrão.
