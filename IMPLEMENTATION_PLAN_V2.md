# Plano de Implementação - V2 ERP (feature/v2-erp)

> **Branch:** `feature/v2-erp`
> **Status:** Em Desenvolvimento
> **Data:** 2026-02-01

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Sprint 1 - Correções Críticas](#sprint-1---correções-críticas)
3. [Sprint 2 - Segurança e Validação](#sprint-2---segurança-e-validação)
4. [Sprint 3 - Performance e Arquitetura](#sprint-3---performance-e-arquitetura)
5. [Sprint 4 - UX e Acessibilidade](#sprint-4---ux-e-acessibilidade)
6. [Sprint 5 - Refinamentos](#sprint-5---refinamentos)
7. [Sprint 6 - Chat Multimídia (Áudio, Vídeo, Imagens)](#sprint-6---chat-multimídia-áudio-vídeo-imagens)
8. [Sprint 7 - Notificações Multi-Canal para Técnicos](#sprint-7---notificações-multi-canal-para-técnicos)
9. [Plano de Testes](#plano-de-testes)

---

## Visão Geral

### Objetivos Principais
- ✅ Corrigir problemas críticos de segurança e validação
- ✅ Implementar coleta obrigatória de nome/setor em todos os fluxos do bot
- ✅ Melhorar performance e escalabilidade
- ✅ Aumentar usabilidade e acessibilidade do frontend
- ✅ Resolver problemas de duplicação e persistência

### Estatísticas
- **Total de Melhorias:** 44 (base) + 15 (chat multimídia) + 8 (notificações) = **67**
- **Críticas:** 12
- **Alta Prioridade:** 17
- **Média Prioridade:** 15
- **Novas Funcionalidades:** 23 (Sprint 6 + 7)

---

## Sprint 1 - Correções Críticas

**Duração:** 1 semana
**Foco:** Segurança, validação e fluxos do bot

### 1.1 Backend - Autorização por Role

**Problema:** Qualquer usuário autenticado pode criar/deletar estoque e aprovar reservas.

#### Arquivos Afetados
- `backend/src/presentation/controllers/stock/stock.controller.ts`
- `backend/src/presentation/controllers/reservations/reservation.controller.ts`

#### Implementação

```typescript
// 1. Criar decorator de roles
// backend/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  STOCK_MANAGER = 'STOCK_MANAGER',
  VIEWER = 'VIEWER',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// 2. Criar RolesGuard
// backend/src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

```typescript
// 3. Aplicar nos controllers
// backend/src/presentation/controllers/stock/stock.controller.ts
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';

@Controller('stock')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StockController {

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
  async findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
  async create(@Body() dto: CreateStockItemDto) {
    return this.stockService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
    return this.stockService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }

  @Post(':id/movement')
  @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER, UserRole.AGENT)
  async registerMovement(@Param('id') id: string, @Body() dto: StockMovementDto) {
    return this.stockService.registerMovement(id, dto);
  }
}
```

```typescript
// 4. Aplicar no ReservationController
// backend/src/presentation/controllers/reservations/reservation.controller.ts
@Controller('reservations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReservationController {

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
  async findAll(@Query() query: ReservationQueryDto) {
    return this.reservationService.findAll(query);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER)
  async create(@Body() dto: CreateReservationDto) {
    return this.reservationService.create(dto);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateReservationStatusDto) {
    return this.reservationService.updateStatus(id, dto);
  }
}
```

#### Checklist
- [ ] Criar `roles.decorator.ts`
- [ ] Criar `roles.guard.ts`
- [ ] Atualizar `stock.controller.ts` com `@Roles()`
- [ ] Atualizar `reservation.controller.ts` com `@Roles()`
- [ ] Testar acesso negado para usuários sem permissão
- [ ] Documentar roles na API

---

### 1.2 Backend - Race Condition em updateStatus

**Problema:** Atualização de status sem transação pode corromper dados.

#### Arquivo Afetado
- `backend/src/presentation/controllers/reservations/reservation.service.ts` (linhas 177-189)

#### Implementação

```typescript
// reservation.service.ts
async updateStatus(id: string, dto: UpdateReservationStatusDto): Promise<Reservation> {
  const reservation = await this.findOne(id);

  // Validar transições de status
  const validTransitions: Record<string, string[]> = {
    PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['IN_USE', 'CANCELLED'],
    IN_USE: ['COMPLETED', 'CANCELLED'],
    REJECTED: [],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (!validTransitions[reservation.status]?.includes(dto.status)) {
    throw new BadRequestException(
      `Transição inválida de ${reservation.status} para ${dto.status}`
    );
  }

  // ✅ USAR TRANSAÇÃO
  return this.prisma.$transaction(async (tx) => {
    // Atualizar status do asset se necessário
    if (dto.status === 'IN_USE') {
      await tx.stockItem.update({
        where: { id: reservation.stockItemId },
        data: { assetStatus: 'IN_USE' },
      });
    } else if (dto.status === 'COMPLETED' || dto.status === 'CANCELLED') {
      await tx.stockItem.update({
        where: { id: reservation.stockItemId },
        data: { assetStatus: 'AVAILABLE' },
      });
    }

    // Atualizar reserva
    return tx.reservation.update({
      where: { id },
      data: {
        status: dto.status,
        updatedAt: new Date(),
      },
      include: {
        stockItem: true,
      },
    });
  });
}
```

#### Checklist
- [ ] Refatorar `updateStatus` para usar `$transaction`
- [ ] Adicionar lógica para COMPLETED e CANCELLED
- [ ] Testar cenário de concorrência (2 requests simultâneos)
- [ ] Adicionar logs de auditoria

---

### 1.3 Backend - Corrigir lowStock Hardcoded

**Problema:** Compara com `5` fixo ao invés de `minQuantity` do item.

#### Arquivo Afetado
- `backend/src/presentation/controllers/stock/stock.service.ts` (linhas 47-53, 187)

#### Implementação

```typescript
// stock.service.ts

async findAll(query: StockQueryDto) {
  const where: any = { active: true };

  // Outros filtros...

  // ❌ ANTES:
  // if (query.lowStock) {
  //   where.quantity = { lte: 5 };
  // }

  // ✅ DEPOIS:
  // Remover filtro aqui e fazer pós-processamento ou usar raw query

  const items = await this.prisma.stockItem.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      reservations: {
        where: { status: { in: ['PENDING', 'APPROVED', 'IN_USE'] } },
        orderBy: { startTime: 'asc' },
        take: 5,
      },
    },
  });

  // Filtrar lowStock após busca
  if (query.lowStock) {
    return items.filter(item => Number(item.quantity) <= Number(item.minQuantity));
  }

  return items;
}

async getStats(stockType?: string) {
  const where: any = { active: true };
  if (stockType) where.stockType = stockType;

  // ❌ ANTES:
  // const lowStock = await this.prisma.stockItem.count({
  //   where: { ...where, quantity: { lte: 5 } }
  // });

  // ✅ DEPOIS: Usar raw query
  const lowStockResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM stock_items
    WHERE active = true
      AND quantity <= "minQuantity"
      ${stockType ? this.prisma.$queryRaw`AND "stockType" = ${stockType}` : this.prisma.$queryRaw``}
  `;

  const lowStock = Number(lowStockResult[0]?.count || 0);

  // Resto do código...
}
```

#### Checklist
- [ ] Refatorar `findAll` com filtro pós-processamento
- [ ] Refatorar `getStats` com raw query
- [ ] Criar índice em `(quantity, minQuantity)` no Prisma
- [ ] Testar com diferentes valores de `minQuantity`
- [ ] Documentar mudança no README

---

### 1.4 Backend - Paginação em findAll

**Problema:** `findAll()` carrega TODOS os itens sem limite.

#### Arquivos Afetados
- `backend/src/presentation/controllers/stock/stock.service.ts`
- `backend/src/presentation/controllers/stock/stock.dto.ts`
- `backend/src/presentation/controllers/reservations/reservation.service.ts`

#### Implementação

```typescript
// stock.dto.ts - Adicionar paginação
export class StockQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Outros campos...
}

// Criar DTO de resposta paginada
export class PaginatedStockResponseDto {
  items: StockItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
```

```typescript
// stock.service.ts
async findAll(query: StockQueryDto): Promise<PaginatedStockResponseDto> {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { active: true };

  // Aplicar filtros...
  if (query.stockType) where.stockType = query.stockType;
  if (query.category) where.category = query.category;
  if (query.assetStatus) where.assetStatus = query.assetStatus;

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Buscar com paginação
  const [items, total] = await Promise.all([
    this.prisma.stockItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { reservations: true },
        },
      },
    }),
    this.prisma.stockItem.count({ where }),
  ]);

  // Filtro lowStock pós-processamento (se necessário)
  let filteredItems = items;
  let filteredTotal = total;

  if (query.lowStock) {
    filteredItems = items.filter(item =>
      Number(item.quantity) <= Number(item.minQuantity)
    );
    filteredTotal = filteredItems.length;
  }

  return {
    items: filteredItems,
    total: filteredTotal,
    page,
    limit,
    pages: Math.ceil(filteredTotal / limit),
  };
}
```

#### Checklist
- [ ] Adicionar `page` e `limit` em `StockQueryDto`
- [ ] Criar `PaginatedStockResponseDto`
- [ ] Refatorar `findAll` com `skip` e `take`
- [ ] Aplicar mesma lógica em `reservation.service.ts`
- [ ] Atualizar frontend para paginar
- [ ] Testar com 1000+ registros

---

### 1.5 Bot - Coleta Obrigatória de Nome e Setor

**Problema:** Fluxos "Falar com Técnico" (4) e "Reservar Equipamento" (5) não coletam nome/setor.

#### Arquivo Afetado
- `bot/src/handlers/flow-handler.js`

#### Implementação

```javascript
// flow-handler.js

class FlowHandler {
  /**
   * Garantir que dados do usuário estejam disponíveis antes de continuar
   * @param {object} sock - Socket WhatsApp
   * @param {string} from - JID completo
   * @param {object} session - Sessão atual
   * @param {string} nextState - Próximo estado após coletar dados
   * @returns {Promise<boolean>} - true se dados já existem, false se precisa coletar
   */
  async ensureUserData(sock, from, session, nextState) {
    const phone = from.split('@')[0];

    // 1. Verificar se já tem dados na sessão
    if (session.data.contactName && session.data.sector) {
      return true; // Já tem dados completos
    }

    // 2. Verificar se contato existe no backend
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const contactRes = await axios.get(
        `${backendUrl}/api/contacts/by-jid/${encodeURIComponent(from)}`,
        { timeout: 3000 }
      );

      if (contactRes?.data) {
        const contact = contactRes.data;
        session.data.contactName = contact.name;
        session.data.sector = contact.sector;
        await redisService.setSession(phone, session);
        return true; // Dados recuperados do backend
      }
    } catch (e) {
      // Contato não encontrado, continua para coletar
    }

    // 3. Precisa coletar dados - salvar próximo estado e ir para ASK_NAME
    session.data.afterUserData = nextState; // Estado de destino
    session.state = STATES.ASK_NAME;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, 'Olá! Para continuar, preciso de algumas informações.\n\nQual é o seu *nome completo*?');
    return false; // Dados ainda não coletados
  }

  async handleMenu(sock, from, text, session) {
    const phone = from.split('@')[0];

    switch (text) {
      case '4': // Falar com técnico
        // ✅ COLETAR NOME E SETOR ANTES
        session.data.requestedHuman = true;
        const hasData = await this.ensureUserData(sock, from, session, STATES.WAITING_TECHNICIAN);

        if (!hasData) {
          // Dados sendo coletados, fluxo continua em handleAskName
          return;
        }

        // Dados já disponíveis, continuar para técnico
        session.state = STATES.WAITING_TECHNICIAN;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, config.messages.transferToHuman);

        // Criar ticket com dados reais
        await rabbitmqService.publishCreateTicket({
          phoneNumber: from,
          title: "Falar com Técnico",
          description: "Solicitação direta de atendimento humano via menu do bot.",
          sector: session.data.sector,  // ✅ Setor real
          category: "Suporte",
          customerName: session.data.contactName,  // ✅ Nome real
          priority: "HIGH"
        });

        await rabbitmqService.publishNotification(
          'human_requested',
          null,
          { phone, message: `${session.data.contactName} (${session.data.sector}) solicitou atendimento humano` }
        );
        break;

      case '5': // Reservar equipamento
        // ✅ COLETAR NOME E SETOR ANTES
        const hasDataReserv = await this.ensureUserData(sock, from, session, STATES.SELECT_EQUIPMENT);

        if (!hasDataReserv) {
          // Dados sendo coletados, salvar contexto
          session.data.reservationFlow = true;
          await redisService.setSession(phone, session);
          return;
        }

        // Dados já disponíveis, buscar equipamentos
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          const equipRes = await axios.get(`${backendUrl}/api/stock?category=ASSET&assetStatus=AVAILABLE`, {
            timeout: 5000,
          });

          const availableItems = equipRes.data.items || equipRes.data || [];

          if (availableItems.length === 0) {
            await this.sendMessage(sock, from, config.messages.noEquipmentsAvailable);
            break;
          }

          session.data.availableEquipments = availableItems;
          session.state = STATES.SELECT_EQUIPMENT;
          await redisService.setSession(phone, session);
          await this.sendMessage(sock, from, config.messages.askEquipmentList(availableItems));
        } catch (e) {
          console.error('Erro ao buscar equipamentos:', e.message);
          await this.sendMessage(sock, from, '❌ Erro ao buscar equipamentos. Tente novamente mais tarde.');
        }
        break;

      // Outros cases...
    }
  }

  async handleAskName(sock, from, text, session) {
    const phone = from.split('@')[0];
    const name = text.trim();

    if (name.length < 3) {
      await this.sendMessage(sock, from, 'Por favor, informe seu nome completo para que possamos te identificar.');
      return;
    }

    session.data.contactName = name;

    // ✅ NOVA LÓGICA: Se tem afterUserData, pedir setor genérico
    if (session.data.afterUserData) {
      session.state = STATES.SELECT_SECTOR_GENERIC;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, `Obrigado, ${name}!\n\nAgora, informe seu *setor/departamento*:`);
      return;
    }

    // Fluxo normal de ticket (TI ou Elétrica)
    if (session.data.ticketType === 'electric') {
      session.state = STATES.SELECT_SECTOR_ELECTRIC;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, `Obrigado, ${name}!\n\n${config.messages.askSectorElectric}`);
    } else {
      session.state = STATES.SELECT_SECTOR_TI;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, `Obrigado, ${name}!\n\n${config.messages.askSectorTI}`);
    }
  }

  /**
   * ✅ NOVO HANDLER: Coletar setor genérico (texto livre)
   */
  async handleSelectSectorGeneric(sock, from, text, session) {
    const phone = from.split('@')[0];
    const sector = text.trim();

    if (sector.length < 2) {
      await this.sendMessage(sock, from, 'Por favor, informe seu setor (ex: TI, RH, Financeiro, etc.):');
      return;
    }

    session.data.sector = sector;

    // Ir para o estado de destino
    const nextState = session.data.afterUserData || STATES.MENU;
    delete session.data.afterUserData; // Limpar flag

    session.state = nextState;
    await redisService.setSession(phone, session);

    // Executar ação do estado de destino
    if (nextState === STATES.WAITING_TECHNICIAN) {
      // Criar ticket de falar com técnico
      await this.sendMessage(sock, from, config.messages.transferToHuman);

      await rabbitmqService.publishCreateTicket({
        phoneNumber: from,
        title: "Falar com Técnico",
        description: "Solicitação direta de atendimento humano via menu do bot.",
        sector: session.data.sector,
        category: "Suporte",
        customerName: session.data.contactName,
        priority: "HIGH"
      });

      await rabbitmqService.publishNotification(
        'human_requested',
        null,
        { phone, message: `${session.data.contactName} (${session.data.sector}) solicitou atendimento humano` }
      );
    } else if (nextState === STATES.SELECT_EQUIPMENT) {
      // Buscar equipamentos para reserva
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const equipRes = await axios.get(`${backendUrl}/api/stock?category=ASSET&assetStatus=AVAILABLE`, {
          timeout: 5000,
        });

        const availableItems = equipRes.data.items || equipRes.data || [];

        if (availableItems.length === 0) {
          await this.sendMessage(sock, from, config.messages.noEquipmentsAvailable);
          return;
        }

        session.data.availableEquipments = availableItems;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, config.messages.askEquipmentList(availableItems));
      } catch (e) {
        console.error('Erro ao buscar equipamentos:', e.message);
        await this.sendMessage(sock, from, '❌ Erro ao buscar equipamentos. Tente novamente mais tarde.');
      }
    }
  }

  async handleMessage(sock, from, text, msg) {
    // ... código existente ...

    // Adicionar novo case no switch
    switch (session.state) {
      // ... cases existentes ...

      case STATES.SELECT_SECTOR_GENERIC:
        await this.handleSelectSectorGeneric(sock, from, text, session);
        break;

      // ... resto dos cases ...
    }
  }
}
```

```javascript
// Adicionar novo estado em STATES
const STATES = {
  // ... estados existentes ...
  SELECT_SECTOR_GENERIC: 'select_sector_generic',  // ✅ NOVO
};
```

#### Checklist
- [ ] Adicionar `SELECT_SECTOR_GENERIC` em STATES
- [ ] Criar método `ensureUserData()`
- [ ] Criar handler `handleSelectSectorGeneric()`
- [ ] Refatorar case '4' (Falar com Técnico)
- [ ] Refatorar case '5' (Reservar Equipamento)
- [ ] Atualizar `handleAskName()` para suportar fluxo genérico
- [ ] Testar fluxo completo sem contato cadastrado
- [ ] Testar fluxo com contato já cadastrado
- [ ] Adicionar logs de auditoria

---

### 1.6 Bot - Validação de Data Inválida

**Problema:** "30/02/2026" é silenciosamente corrigida para março.

#### Arquivo Afetado
- `bot/src/handlers/flow-handler.js` (linhas 759-760)

#### Implementação

```javascript
// flow-handler.js

/**
 * Validar se uma data é válida (não é auto-corrigida)
 */
function isValidDate(day, month, year) {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === parseInt(year) &&
    date.getMonth() === parseInt(month) - 1 &&
    date.getDate() === parseInt(day)
  );
}

async handleReservationStart(sock, from, text, session) {
  const phone = from.split('@')[0];

  // Parse date format: DD/MM/YYYY HH:MM
  const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);

  if (!dateMatch) {
    await this.sendMessage(sock, from, '❌ Formato inválido. Use: DD/MM/AAAA HH:MM\n\nExemplo: 30/01/2026 14:00');
    return;
  }

  const [, day, month, year, hour, minute] = dateMatch;

  // ✅ VALIDAR SE DATA É REAL
  if (!isValidDate(day, month, year)) {
    await this.sendMessage(sock, from, `❌ Data inválida: ${day}/${month}/${year} não existe.\n\nPor favor, digite uma data válida (DD/MM/AAAA HH:MM):`);
    return;
  }

  // ✅ VALIDAR HORA
  if (parseInt(hour) > 23 || parseInt(minute) > 59) {
    await this.sendMessage(sock, from, `❌ Horário inválido: ${hour}:${minute}\n\nUse horário de 00:00 a 23:59.`);
    return;
  }

  const startDate = new Date(year, parseInt(month) - 1, day, hour, minute);

  if (startDate < new Date()) {
    await this.sendMessage(sock, from, '❌ A data não pode ser no passado. Digite uma data futura:');
    return;
  }

  session.data.startDate = startDate.toISOString();
  session.data.startDateFormatted = text;
  session.state = STATES.ASK_RESERVATION_END;
  await redisService.setSession(phone, session);

  await this.sendMessage(sock, from, config.messages.askReservationEnd);
}

async handleReservationEnd(sock, from, text, session) {
  const phone = from.split('@')[0];

  const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);

  if (!dateMatch) {
    await this.sendMessage(sock, from, '❌ Formato inválido. Use: DD/MM/AAAA HH:MM\n\nExemplo: 30/01/2026 18:00');
    return;
  }

  const [, day, month, year, hour, minute] = dateMatch;

  // ✅ VALIDAR SE DATA É REAL
  if (!isValidDate(day, month, year)) {
    await this.sendMessage(sock, from, `❌ Data inválida: ${day}/${month}/${year} não existe.\n\nPor favor, digite uma data válida (DD/MM/AAAA HH:MM):`);
    return;
  }

  // ✅ VALIDAR HORA
  if (parseInt(hour) > 23 || parseInt(minute) > 59) {
    await this.sendMessage(sock, from, `❌ Horário inválido: ${hour}:${minute}\n\nUse horário de 00:00 a 23:59.`);
    return;
  }

  const endDate = new Date(year, parseInt(month) - 1, day, hour, minute);
  const startDate = new Date(session.data.startDate);

  if (endDate <= startDate) {
    await this.sendMessage(sock, from, '❌ A data de devolução deve ser após a data de início. Digite novamente:');
    return;
  }

  // ✅ VALIDAR DURAÇÃO (mínimo 1 hora, máximo 30 dias)
  const durationHours = (endDate - startDate) / (1000 * 60 * 60);

  if (durationHours < 1) {
    await this.sendMessage(sock, from, '❌ A reserva deve ter duração mínima de 1 hora. Digite novamente:');
    return;
  }

  if (durationHours > 720) { // 30 dias
    await this.sendMessage(sock, from, '❌ A reserva não pode ter mais de 30 dias. Digite novamente:');
    return;
  }

  session.data.endDate = endDate.toISOString();
  session.data.endDateFormatted = text;
  session.state = STATES.ASK_RESERVATION_REASON;
  await redisService.setSession(phone, session);

  await this.sendMessage(sock, from, config.messages.askReservationReason);
}
```

#### Checklist
- [ ] Criar função `isValidDate()`
- [ ] Validar data em `handleReservationStart`
- [ ] Validar data em `handleReservationEnd`
- [ ] Validar horário (0-23:0-59)
- [ ] Validar duração mínima (1h) e máxima (30 dias)
- [ ] Testar datas inválidas (30/02, 31/04, etc.)
- [ ] Testar horários inválidos (25:00, 12:99)

---

### 1.7 Bot - Aceitar "menu" Durante Fluxo

**Problema:** Digitar "menu" durante reserva não cancela o fluxo.

#### Arquivo Afetado
- `bot/src/handlers/flow-handler.js` (linha 65-278)

#### Implementação

```javascript
// flow-handler.js

async handleMessage(sock, from, text, msg) {
  const phone = from.split('@')[0];
  const normalizedText = text.trim().toLowerCase();

  // ✅ PERMITIR "MENU" EM QUALQUER ESTADO (exceto WAITING_TECHNICIAN)
  const menuCommands = ['menu', 'inicio', 'iniciar', 'cancelar', 'voltar'];
  const isMenuCommand = menuCommands.includes(normalizedText);

  if (isMenuCommand) {
    const session = await redisService.getSession(phone);

    // Se está esperando técnico, não cancelar (manter conversa)
    if (session?.state === STATES.WAITING_TECHNICIAN) {
      // Encaminhar mensagem ao técnico
      await this.handleWaitingTechnician(sock, from, text, session, msg);
      return;
    }

    // Cancelar qualquer fluxo e voltar ao menu
    await this.sendMessage(sock, from, '❌ Operação cancelada.\n\n' + config.messages.welcome);
    await redisService.setSession(phone, { state: STATES.MENU, data: {} });
    return;
  }

  // Resto do código continua...
  // ...
}
```

#### Checklist
- [ ] Adicionar verificação de `menuCommands` no início de `handleMessage`
- [ ] Exceção para WAITING_TECHNICIAN
- [ ] Testar cancelamento durante reserva
- [ ] Testar cancelamento durante criação de ticket
- [ ] Testar que "menu" não cancela conversa com técnico

---

### 1.8 Frontend - Remover Tipos `any`

**Problema:** Uso de `any` em múltiplos componentes reduz type safety.

#### Arquivos Afetados
- `frontend/src/app/App.tsx`
- `frontend/src/app/components/ChatView.tsx`
- `frontend/src/app/views/*.tsx`

#### Implementação

```typescript
// Criar tipos globais
// frontend/src/types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'STOCK_MANAGER' | 'VIEWER';
  level?: 'N1' | 'N2' | 'N3';
}

export interface Ticket {
  id: string;
  glpiId?: number;
  title: string;
  description: string;
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  phoneNumber: string;
  customerName: string;
  sector: string;
  location?: string;
  assignedTo?: User;
  createdAt: string;
  updatedAt: string;
  rating?: number;
}

export interface Message {
  id: string;
  ticketId: string;
  content: string;
  direction: 'INCOMING' | 'OUTGOING';
  sender?: User;
  createdAt: string;
  read: boolean;
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  stockType: 'CONSUMABLE' | 'ASSET';
  category: string;
  quantity: number;
  minQuantity: number;
  unitCost?: number;
  assetTag?: string;
  assetStatus?: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
  active: boolean;
}

export interface Reservation {
  id: string;
  stockItemId: string;
  stockItem?: StockItem;
  userName: string;
  userPhone: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'IN_USE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
```

```typescript
// App.tsx - Remover any
import { User, Ticket } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);  // ✅ Ao invés de any
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);  // ✅

  // ... resto do código
}
```

```typescript
// ChatView.tsx
import { Ticket, Message } from '../types';

interface ChatViewProps {
  ticket: Ticket;  // ✅ Ao invés de any
  onClose: () => void;
}

function ChatView({ ticket, onClose }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);  // ✅

  // ... resto do código
}
```

#### Checklist
- [ ] Criar `frontend/src/types/index.ts` com interfaces
- [ ] Substituir `any` em `App.tsx`
- [ ] Substituir `any` em `ChatView.tsx`
- [ ] Substituir `any` em todas as views
- [ ] Adicionar tipos em `api.ts`
- [ ] Executar `tsc --noEmit` para verificar erros

---

### 1.9 Correções de Debug (Plano Existente)

**Origem:** `implementation_plan.md`

#### 1.9.1 Duplicação de Mensagens

**Arquivo:** `backend/src/presentation/controllers/messages/messages.service.ts`

```typescript
async createFromWhatsApp(
  phoneNumber: string,
  content: string,
  whatsappMessageId?: string,
): Promise<{ message: Message; isNew: boolean }> {  // ✅ Retornar isNew

  // Verificar duplicata
  if (whatsappMessageId) {
    const existing = await this.prisma.message.findFirst({
      where: { whatsappMessageId },
    });

    if (existing) {
      console.log(`⚠️ Duplicata ignorada: ${whatsappMessageId}`);
      return { message: existing, isNew: false };  // ✅ isNew = false
    }
  }

  // Criar mensagem...
  const message = await this.prisma.message.create({
    data: {
      ticketId,
      content,
      direction: 'INCOMING',
      whatsappMessageId,
      createdAt: new Date(),
    },
  });

  return { message, isNew: true };  // ✅ isNew = true
}
```

**Arquivo:** `backend/src/infrastructure/services/incoming-messages.consumer.ts`

```typescript
async processMessage(data: any) {
  const { phoneNumber, content, whatsappMessageId } = data;

  // Criar mensagem
  const result = await this.messagesService.createFromWhatsApp(
    phoneNumber,
    content,
    whatsappMessageId,
  );

  // ✅ Apenas adicionar followup se mensagem é nova
  if (result.isNew && result.message.ticketId) {
    const ticket = await this.ticketsService.findOne(result.message.ticketId);

    if (ticket?.glpiId) {
      await this.glpiService.addFollowup(ticket.glpiId, content);
    }
  }
}
```

#### 1.9.2 Fluxo "Olá" Incorreto

**Arquivo:** `bot/src/handlers/flow-handler.js`

```javascript
// Adicionar logs de debug
if (['oi', 'olá', 'ola', 'menu', 'inicio', 'iniciar'].includes(normalizedText)) {
  let lastTicketId = await redisService.getTicketByPhone(phone);

  console.log(`🔍 DEBUG: verificando ticket para ${phone}, Redis: ${lastTicketId}`);

  // Se não encontrou no Redis, tentar buscar no backend
  if (!lastTicketId) {
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      // ✅ ADICIONAR encodeURIComponent
      const res = await axios.get(
        `${backendUrl}/api/bot/tickets/by-phone/${encodeURIComponent(phone)}`,
        { timeout: 3000 }
      );
      const ticket = res.data;

      console.log(`🔍 DEBUG: Backend retornou:`, ticket);

      if (ticket && !['CLOSED', 'RESOLVED'].includes(ticket.status)) {
        lastTicketId = ticket.glpiId || ticket.id;
        await redisService.linkTicketToPhone(phone, lastTicketId);
      }
    } catch (e) {
      console.error(`❌ DEBUG: Erro ao buscar ticket do backend:`, e.message);
    }
  }

  // ... resto da lógica
}
```

#### Checklist
- [ ] Atualizar `messages.service.ts` para retornar `{ message, isNew }`
- [ ] Atualizar `incoming-messages.consumer.ts` para verificar `isNew`
- [ ] Adicionar `encodeURIComponent` em `flow-handler.js`
- [ ] Adicionar logs de debug
- [ ] Testar duplicação de mensagens
- [ ] Testar fluxo "Olá" com ticket ativo

---

## Sprint 2 - Segurança e Validação

**Duração:** 1 semana
**Foco:** Validações de entrada, tratamento de erros, auditoria

### 2.1 Backend - Validação de Entrada

#### 2.1.1 Limitar Tamanho de Search

**Arquivo:** `backend/src/presentation/controllers/stock/stock.dto.ts`

```typescript
export class StockQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)  // ✅ Limitar tamanho
  @Matches(/^[a-zA-Z0-9\s\-\.áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]+$/)  // ✅ Apenas chars permitidos
  search?: string;

  // Outros campos...
}
```

#### 2.1.2 Validar Ranges em Movimentos

**Arquivo:** `backend/src/presentation/controllers/stock/stock.dto.ts`

```typescript
export class StockMovementDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-9999)  // ✅ Máximo de saída
  @Max(9999)   // ✅ Máximo de entrada
  quantity: number;

  @IsString()
  @MaxLength(200)
  reason: string;

  @IsEnum(['IN', 'OUT', 'ADJUSTMENT', 'LOSS'])
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'LOSS';
}
```

#### 2.1.3 Validar UUID

```typescript
import { IsUUID } from 'class-validator';

// Em todos os @Param('id')
async findOne(@Param('id', ParseUUIDPipe) id: string) {
  return this.stockService.findOne(id);
}
```

#### Checklist
- [ ] Adicionar validações em todos os DTOs
- [ ] Usar `ParseUUIDPipe` em params
- [ ] Adicionar `@MaxLength` em strings
- [ ] Adicionar `@Min/@Max` em números
- [ ] Testar com payloads maliciosos

---

### 2.2 Backend - Validação de Conflitos de Reserva

**Problema:** Conflito não detecta reservas exatamente iguais.

**Arquivo:** `backend/src/presentation/controllers/reservations/reservation.service.ts`

```typescript
async create(dto: CreateReservationDto): Promise<Reservation> {
  const startTime = new Date(dto.startTime);
  const endTime = new Date(dto.endTime);

  // Validar datas
  if (endTime <= startTime) {
    throw new BadRequestException('Data de fim deve ser após data de início');
  }

  // Validar duração
  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationHours < 1) {
    throw new BadRequestException('Duração mínima: 1 hora');
  }
  if (durationHours > 720) {
    throw new BadRequestException('Duração máxima: 30 dias');
  }

  // ✅ MELHORAR DETECÇÃO DE CONFLITO
  const conflict = await this.prisma.reservation.findFirst({
    where: {
      stockItemId: dto.stockItemId,
      status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
      OR: [
        // Novo começa durante existente
        {
          startTime: { lte: startTime },
          endTime: { gt: startTime },
        },
        // Novo termina durante existente
        {
          startTime: { lt: endTime },
          endTime: { gte: endTime },
        },
        // Novo engloba existente
        {
          startTime: { gte: startTime },
          endTime: { lte: endTime },
        },
        // ✅ ADICIONAR: Exatamente igual
        {
          startTime: startTime,
          endTime: endTime,
        },
      ],
    },
    include: {
      stockItem: true,
    },
  });

  if (conflict) {
    throw new BadRequestException({
      code: 'RESERVATION_CONFLICT',
      message: `Equipamento já reservado de ${conflict.startTime.toLocaleString('pt-BR')} até ${conflict.endTime.toLocaleString('pt-BR')}`,
      conflictingReservation: {
        id: conflict.id,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
        userName: conflict.userName,
      },
    });
  }

  // ✅ VERIFICAR SE ASSET ESTÁ DISPONÍVEL
  const stockItem = await this.prisma.stockItem.findUnique({
    where: { id: dto.stockItemId },
  });

  if (!stockItem) {
    throw new NotFoundException('Item de estoque não encontrado');
  }

  if (stockItem.category === 'ASSET' && stockItem.assetStatus !== 'AVAILABLE') {
    throw new BadRequestException(
      `Equipamento não disponível. Status atual: ${stockItem.assetStatus}`
    );
  }

  // Criar reserva
  return this.prisma.reservation.create({
    data: {
      stockItemId: dto.stockItemId,
      userName: dto.userName,
      userPhone: dto.userPhone,
      startTime,
      endTime,
      notes: dto.notes,
      status: 'PENDING',
    },
    include: {
      stockItem: true,
    },
  });
}
```

#### Checklist
- [ ] Melhorar lógica de detecção de conflito
- [ ] Validar duração mínima/máxima
- [ ] Verificar status do asset
- [ ] Retornar informações do conflito ao usuário
- [ ] Adicionar testes unitários de conflito

---

### 2.3 Backend - Logging e Auditoria

#### 2.3.1 Adicionar Logger

**Arquivo:** `backend/src/presentation/controllers/stock/stock.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);  // ✅

  async create(dto: CreateStockItemDto): Promise<StockItem> {
    try {
      this.logger.log(`Criando item de estoque: ${dto.name}`);

      const item = await this.prisma.stockItem.create({
        data: dto,
      });

      this.logger.log(`Item criado com sucesso: ${item.id}`);
      return item;

    } catch (error) {
      this.logger.error(`Erro ao criar item: ${error.message}`, error.stack);

      if (error.code === 'P2002') {
        throw new BadRequestException('Código ou Asset Tag já existe');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateStockItemDto): Promise<StockItem> {
    try {
      this.logger.log(`Atualizando item ${id}`);

      await this.findOne(id);

      const updated = await this.prisma.stockItem.update({
        where: { id },
        data: dto,
      });

      this.logger.log(`Item ${id} atualizado com sucesso`);
      return updated;

    } catch (error) {
      this.logger.error(`Erro ao atualizar item ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Aplicar em todos os métodos...
}
```

#### 2.3.2 Adicionar Campos de Auditoria no Schema

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model StockItem {
  id            String   @id @default(uuid())
  code          String   @unique
  name          String
  // ... campos existentes ...

  // ✅ ADICIONAR AUDITORIA
  createdBy     String?
  createdByUser User?    @relation("StockItemCreatedBy", fields: [createdBy], references: [id])
  updatedBy     String?
  updatedByUser User?    @relation("StockItemUpdatedBy", fields: [updatedBy], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([createdBy])
  @@index([updatedBy])
}

model Reservation {
  id            String   @id @default(uuid())
  // ... campos existentes ...

  // ✅ ADICIONAR AUDITORIA
  approvedBy    String?
  approvedByUser User?   @relation("ReservationApprovedBy", fields: [approvedBy], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([approvedBy])
}
```

#### 2.3.3 Atualizar Services para Preencher Auditoria

```typescript
// stock.service.ts
async create(dto: CreateStockItemDto, userId: string): Promise<StockItem> {
  return this.prisma.stockItem.create({
    data: {
      ...dto,
      createdBy: userId,  // ✅
      updatedBy: userId,  // ✅
    },
  });
}

async update(id: string, dto: UpdateStockItemDto, userId: string): Promise<StockItem> {
  await this.findOne(id);

  return this.prisma.stockItem.update({
    where: { id },
    data: {
      ...dto,
      updatedBy: userId,  // ✅
      updatedAt: new Date(),
    },
  });
}
```

```typescript
// stock.controller.ts - Extrair user do JWT
@Post()
@Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
async create(@Body() dto: CreateStockItemDto, @Req() req) {
  const userId = req.user.id;  // ✅ Do JWT
  return this.stockService.create(dto, userId);
}

@Put(':id')
@Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto, @Req() req) {
  const userId = req.user.id;  // ✅
  return this.stockService.update(id, dto, userId);
}
```

#### Checklist
- [ ] Adicionar `Logger` em todos os services
- [ ] Adicionar try-catch com logs em operações críticas
- [ ] Adicionar campos de auditoria no Prisma
- [ ] Criar migration
- [ ] Atualizar controllers para passar `userId`
- [ ] Atualizar services para preencher campos
- [ ] Criar endpoint GET `/audit/:model/:id` para histórico

---

### 2.4 Backend - Rate Limiting

**Arquivo:** `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet para headers de segurança
  app.use(helmet());

  // ✅ RATE LIMITING GLOBAL
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // limite de 100 requests por IP
      message: 'Muitas requisições deste IP, tente novamente mais tarde.',
    })
  );

  // ✅ RATE LIMITING ESPECÍFICO PARA LOGIN
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 tentativas de login em 15min
    skipSuccessfulRequests: true,
  });

  app.use('/api/auth/login', loginLimiter);

  await app.listen(3000);
}
bootstrap();
```

#### Checklist
- [ ] Instalar `express-rate-limit` e `helmet`
- [ ] Configurar rate limiting global
- [ ] Configurar rate limiting para /login
- [ ] Configurar rate limiting para endpoints críticos
- [ ] Testar com múltiplas requisições

---

### 2.5 Bot - Tratamento de Redis Offline

**Problema:** `setSession()` falha silenciosamente se Redis estiver offline.

**Arquivo:** `bot/src/services/redis.js`

```javascript
class RedisService {
  async setSession(phone, session, ttl = 86400) {
    try {
      await this.client.setex(
        `session:${phone}`,
        ttl,
        JSON.stringify(session)
      );
      return true;
    } catch (error) {
      // ✅ LOGAR E NOTIFICAR
      console.error(`❌ Redis offline - Não foi possível salvar sessão de ${phone}:`, error.message);

      // ✅ FALLBACK: Salvar em memória temporária (opcional)
      this.memoryFallback = this.memoryFallback || new Map();
      this.memoryFallback.set(`session:${phone}`, {
        data: session,
        expires: Date.now() + (ttl * 1000),
      });

      return false;  // ✅ Retornar false para indicar falha
    }
  }

  async getSession(phone) {
    try {
      const data = await this.client.get(`session:${phone}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Redis offline - Tentando fallback para ${phone}:`, error.message);

      // ✅ FALLBACK: Buscar em memória
      if (this.memoryFallback?.has(`session:${phone}`)) {
        const cached = this.memoryFallback.get(`session:${phone}`);

        if (cached.expires > Date.now()) {
          console.log(`✅ Sessão recuperada do fallback para ${phone}`);
          return cached.data;
        } else {
          this.memoryFallback.delete(`session:${phone}`);
        }
      }

      return null;
    }
  }

  // ✅ ADICIONAR HEALTH CHECK
  async healthCheck() {
    try {
      await this.client.ping();
      return { status: 'healthy', message: 'Redis conectado' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}
```

**Arquivo:** `bot/src/handlers/flow-handler.js`

```javascript
async handleMessage(sock, from, text, msg) {
  const phone = from.split('@')[0];

  // ✅ VERIFICAR SAÚDE DO REDIS
  const redisHealth = await redisService.healthCheck();
  if (redisHealth.status === 'unhealthy') {
    console.warn('⚠️ Redis indisponível, usando fallback em memória');
  }

  let session = await redisService.getSession(phone);

  // ✅ VERIFICAR SE CONSEGUIU SALVAR
  const saved = await redisService.setSession(phone, session);
  if (!saved) {
    console.error(`⚠️ Não foi possível persistir sessão de ${phone} - usando fallback`);
  }

  // ... resto do código
}
```

#### Checklist
- [ ] Adicionar try-catch em `setSession` e `getSession`
- [ ] Implementar fallback em memória
- [ ] Adicionar método `healthCheck()`
- [ ] Logar erros de Redis
- [ ] Testar com Redis offline
- [ ] Configurar alerta de monitoramento

---

## Sprint 3 - Performance e Arquitetura

**Duração:** 1 semana
**Foco:** Otimizações, cache, refatoração

### 3.1 Backend - Cache de Stats

**Arquivo:** `backend/src/presentation/controllers/stock/stock.service.ts`

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,  // ✅
  ) {}

  async getStats(stockType?: string): Promise<any> {
    // ✅ VERIFICAR CACHE
    const cacheKey = `stock:stats:${stockType || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      this.logger.debug(`Stats recuperadas do cache: ${cacheKey}`);
      return cached;
    }

    // Executar queries...
    const where: any = { active: true };
    if (stockType) where.stockType = stockType;

    const [total, lowStock, assets] = await Promise.all([
      this.prisma.stockItem.count({ where }),
      // ... queries
    ]);

    const stats = {
      total,
      lowStock,
      assets,
      // ...
    };

    // ✅ SALVAR NO CACHE (5 minutos)
    await this.cacheManager.set(cacheKey, stats, 300000);

    return stats;
  }

  async create(dto: CreateStockItemDto, userId: string): Promise<StockItem> {
    const item = await this.prisma.stockItem.create({
      data: { ...dto, createdBy: userId, updatedBy: userId },
    });

    // ✅ INVALIDAR CACHE
    await this.cacheManager.del('stock:stats:all');
    await this.cacheManager.del(`stock:stats:${item.stockType}`);

    return item;
  }

  // Aplicar invalidação em update, delete, registerMovement...
}
```

**Arquivo:** `backend/src/presentation/controllers/stock/stock.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutos padrão
      max: 100, // máximo de 100 itens no cache
    }),
  ],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
```

#### Checklist
- [ ] Instalar `@nestjs/cache-manager` e `cache-manager`
- [ ] Configurar CacheModule
- [ ] Adicionar cache em `getStats()`
- [ ] Invalidar cache em operações de escrita
- [ ] Testar performance antes/depois
- [ ] Adicionar cache em outras queries frequentes

---

### 3.2 Backend - Refatorar Base Service

**Arquivo:** `backend/src/common/base/base-entity.service.ts`

```typescript
import { NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export abstract class BaseEntityService<T> {
  protected abstract modelName: string;
  protected logger: Logger;

  constructor(protected prisma: PrismaService) {
    this.logger = new Logger(this.constructor.name);
  }

  async findOneOrFail(id: string, include?: any): Promise<T> {
    const item = await this.prisma[this.modelName].findUnique({
      where: { id },
      include,
    });

    if (!item) {
      throw new NotFoundException({
        code: `${this.modelName.toUpperCase()}_NOT_FOUND`,
        message: `${this.modelName} ${id} não encontrado`,
        id,
      });
    }

    return item;
  }

  async findAll(where?: any, options?: any): Promise<T[]> {
    return this.prisma[this.modelName].findMany({
      where,
      ...options,
    });
  }

  async count(where?: any): Promise<number> {
    return this.prisma[this.modelName].count({ where });
  }

  async softDelete(id: string, userId?: string): Promise<T> {
    await this.findOneOrFail(id);

    this.logger.log(`Soft delete de ${this.modelName} ${id} por ${userId || 'system'}`);

    return this.prisma[this.modelName].update({
      where: { id },
      data: {
        active: false,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });
  }
}
```

**Aplicar em Services:**

```typescript
// stock.service.ts
import { BaseEntityService } from '../../common/base/base-entity.service';

@Injectable()
export class StockService extends BaseEntityService<StockItem> {
  protected modelName = 'stockItem';

  constructor(
    prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(prisma);
  }

  async findOne(id: string): Promise<StockItem> {
    return this.findOneOrFail(id, {
      reservations: {
        where: { status: { in: ['PENDING', 'APPROVED', 'IN_USE'] } },
        orderBy: { startTime: 'asc' },
        take: 5,
      },
    });
  }

  // Métodos específicos de Stock...
}
```

#### Checklist
- [ ] Criar `base-entity.service.ts`
- [ ] Refatorar `StockService` para estender BaseEntityService
- [ ] Refatorar `ReservationService`
- [ ] Refatorar `PartsService` e `PurchasesService`
- [ ] Remover código duplicado
- [ ] Testar todas as operações

---

### 3.3 Backend - Índices Compostos no Prisma

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model StockItem {
  // ... campos existentes ...

  @@index([stockType])
  @@index([category])
  @@index([assetStatus])

  // ✅ ADICIONAR ÍNDICES COMPOSTOS
  @@index([stockType, category])
  @@index([active, quantity])
  @@index([code])  // Mesmo sendo unique, para queries de busca
  @@index([createdBy, createdAt])
  @@index([updatedBy, updatedAt])
}

model Reservation {
  // ... campos existentes ...

  @@index([stockItemId])
  @@index([status])
  @@index([userPhone])

  // ✅ ADICIONAR ÍNDICES COMPOSTOS
  @@index([stockItemId, status])
  @@index([stockItemId, startTime, endTime])  // Para detecção de conflitos
  @@index([status, startTime])
  @@index([createdAt])
}
```

**Criar Migration:**

```bash
cd backend
npx prisma migrate dev --name add_composite_indexes
```

#### Checklist
- [ ] Adicionar índices compostos no schema
- [ ] Gerar migration
- [ ] Aplicar em dev
- [ ] Analisar query performance com EXPLAIN
- [ ] Aplicar em produção

---

### 3.4 Frontend - Dividir Componentes Grandes

**Problema:** DashboardView (497 linhas), ManagerView (492), StockView (567).

#### Estrutura Sugerida

```
frontend/src/app/views/DashboardView/
├── index.tsx                    # 50 linhas - Container principal
├── components/
│   ├── TicketList.tsx          # 100 linhas
│   ├── TicketFilters.tsx       # 80 linhas
│   ├── StatsCards.tsx          # 60 linhas
│   └── QuickActions.tsx        # 40 linhas
└── hooks/
    ├── useTickets.ts           # Lógica de tickets
    ├── useFilters.ts           # Lógica de filtros
    └── useStats.ts             # Lógica de stats
```

**Exemplo - DashboardView/index.tsx:**

```typescript
import { TicketList } from './components/TicketList';
import { TicketFilters } from './components/TicketFilters';
import { StatsCards } from './components/StatsCards';
import { QuickActions } from './components/QuickActions';
import { useTickets } from './hooks/useTickets';
import { useFilters } from './hooks/useFilters';

export function DashboardView() {
  const { tickets, loading, refresh } = useTickets();
  const { filters, setFilters } = useFilters();

  return (
    <div className="dashboard-container">
      <StatsCards />
      <TicketFilters filters={filters} onChange={setFilters} />
      <QuickActions onRefresh={refresh} />
      <TicketList tickets={tickets} loading={loading} />
    </div>
  );
}
```

**Exemplo - hooks/useTickets.ts:**

```typescript
import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Ticket } from '../../../types';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get<Ticket[]>('/tickets');
      setTickets(response.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar tickets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    loading,
    error,
    refresh: fetchTickets,
  };
}
```

#### Checklist
- [ ] Dividir DashboardView em subcomponentes
- [ ] Dividir ManagerView em subcomponentes
- [ ] Dividir StockView em subcomponentes
- [ ] Criar custom hooks para lógica
- [ ] Aplicar useMemo/useCallback onde necessário
- [ ] Testar renderização e performance

---

### 3.5 Frontend - Lazy Loading de Modais

**Arquivo:** `frontend/src/app/views/StockView.tsx`

```typescript
import { lazy, Suspense } from 'react';

// ✅ LAZY LOAD de modais
const CloseTicketModal = lazy(() => import('../components/modals/CloseTicketModal'));
const AddStockModal = lazy(() => import('../components/modals/AddStockModal'));
const EditStockModal = lazy(() => import('../components/modals/EditStockModal'));

function StockView() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      {/* Conteúdo principal */}

      {/* ✅ Modal só carrega quando necessário */}
      {showAddModal && (
        <Suspense fallback={<div>Carregando...</div>}>
          <AddStockModal
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
```

#### Checklist
- [ ] Identificar modais e componentes grandes
- [ ] Aplicar `lazy()` e `Suspense`
- [ ] Testar carregamento
- [ ] Medir impacto no bundle size

---

## Sprint 4 - UX e Acessibilidade

**Duração:** 1 semana
**Foco:** Usabilidade, feedback, acessibilidade

### 4.1 Frontend - Tratamento de Erro Específico

**Arquivo:** `frontend/src/services/api.ts`

```typescript
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// ✅ INTERCEPTOR DE ERROS
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const { response } = error;

    if (!response) {
      throw {
        code: 'NETWORK_ERROR',
        message: 'Erro de conexão. Verifique sua internet.',
      };
    }

    const data = response.data as any;

    // Erros estruturados do backend
    if (data?.code) {
      throw {
        code: data.code,
        message: data.message,
        details: data,
      };
    }

    // Erros HTTP genéricos
    const errorMap: Record<number, string> = {
      400: 'Dados inválidos',
      401: 'Não autorizado. Faça login novamente.',
      403: 'Sem permissão para esta ação',
      404: 'Recurso não encontrado',
      409: 'Conflito de dados',
      500: 'Erro no servidor',
    };

    throw {
      code: `HTTP_${response.status}`,
      message: errorMap[response.status] || 'Erro desconhecido',
      status: response.status,
    };
  }
);

export { api };
```

**Arquivo:** `frontend/src/app/hooks/useErrorHandler.ts`

```typescript
import { useCallback } from 'react';
import { toast } from 'sonner';  // ou react-hot-toast

interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export function useErrorHandler() {
  const handleError = useCallback((error: ApiError) => {
    // Mapeamento de códigos para mensagens amigáveis
    const errorMessages: Record<string, string> = {
      STOCK_ITEM_NOT_FOUND: 'Item de estoque não encontrado',
      RESERVATION_CONFLICT: 'Horário já reservado. Escolha outro período.',
      UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
      NETWORK_ERROR: 'Sem conexão com o servidor',
    };

    const message = errorMessages[error.code] || error.message;

    // Exibir toast
    toast.error(message, {
      description: error.details?.conflictingReservation
        ? `Reservado por ${error.details.conflictingReservation.userName}`
        : undefined,
    });

    // Log para debug
    console.error('[API Error]', error);

    return message;
  }, []);

  return { handleError };
}
```

**Usar nos componentes:**

```typescript
function StockView() {
  const { handleError } = useErrorHandler();

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/stock/${id}`);
      toast.success('Item removido com sucesso');
    } catch (error) {
      handleError(error as ApiError);
    }
  };
}
```

#### Checklist
- [ ] Criar interceptor de erros em `api.ts`
- [ ] Criar `useErrorHandler` hook
- [ ] Mapear códigos de erro do backend
- [ ] Substituir `alert()` por toasts
- [ ] Adicionar biblioteca de toast (sonner/react-hot-toast)
- [ ] Testar com diferentes tipos de erro

---

### 4.2 Frontend - Skeleton Loaders

**Arquivo:** `frontend/src/app/components/SkeletonCard.tsx`

```typescript
export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg p-4">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}
```

**Usar nos componentes:**

```typescript
import { SkeletonTable } from '../components/SkeletonCard';

function StockView() {
  const { items, loading } = useStock();

  if (loading) {
    return <SkeletonTable />;
  }

  return <StockTable items={items} />;
}
```

#### Checklist
- [ ] Criar componentes Skeleton
- [ ] Substituir spinners genéricos
- [ ] Aplicar em todas as views
- [ ] Testar experiência de loading

---

### 4.3 Frontend - Auto-refresh com Aviso

**Problema:** Dados mudam sem aviso a cada 30s.

**Arquivo:** `frontend/src/app/hooks/useAutoRefresh.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UseAutoRefreshOptions {
  interval: number; // ms
  onRefresh: () => Promise<void>;
  showNotification?: boolean;
}

export function useAutoRefresh({ interval, onRefresh, showNotification = true }: UseAutoRefreshOptions) {
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isPaused) return;

    intervalRef.current = setInterval(async () => {
      if (showNotification) {
        toast.info('Atualizando dados...', { duration: 1000 });
      }

      await onRefresh();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, onRefresh, isPaused, showNotification]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);

  return { isPaused, pause, resume };
}
```

**Usar nos componentes:**

```typescript
function DashboardView() {
  const { tickets, refresh } = useTickets();
  const { isPaused, pause, resume } = useAutoRefresh({
    interval: 30000, // 30s
    onRefresh: refresh,
    showNotification: true,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Dashboard</h1>
        <button onClick={isPaused ? resume : pause}>
          {isPaused ? '▶️ Retomar' : '⏸️ Pausar'} atualização automática
        </button>
      </div>

      <TicketList tickets={tickets} />
    </div>
  );
}
```

#### Checklist
- [ ] Criar `useAutoRefresh` hook
- [ ] Adicionar toast de "Atualizando..."
- [ ] Adicionar botão pausar/retomar
- [ ] Aplicar em DashboardView
- [ ] Testar comportamento

---

### 4.4 Frontend - Acessibilidade (ARIA)

**Problema:** Sem ARIA labels, cor como única indicação, inputs sem labels.

#### 4.4.1 Adicionar ARIA Labels

```typescript
// ✅ ANTES
<button onClick={handleDelete}>
  <TrashIcon />
</button>

// ✅ DEPOIS
<button
  onClick={handleDelete}
  aria-label="Deletar item de estoque"
  title="Deletar item"
>
  <TrashIcon />
</button>
```

#### 4.4.2 Status com Texto + Cor

```typescript
// ✅ ANTES (apenas cor)
<span className={statusColor[printer.status]} />

// ✅ DEPOIS (cor + texto)
<div className="flex items-center gap-2">
  <span
    className={`w-3 h-3 rounded-full ${statusColor[printer.status]}`}
    aria-hidden="true"
  />
  <span className="sr-only md:not-sr-only">
    {statusText[printer.status]}
  </span>
</div>

const statusText = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Atenção',
};
```

#### 4.4.3 Inputs com Labels

```typescript
// ✅ ANTES
<input
  type="text"
  placeholder="Buscar..."
/>

// ✅ DEPOIS
<div className="form-field">
  <label htmlFor="search-input" className="sr-only">
    Buscar itens de estoque
  </label>
  <input
    id="search-input"
    type="text"
    placeholder="Buscar..."
    aria-label="Campo de busca"
  />
</div>
```

#### 4.4.4 Navegação por Teclado

```typescript
// Modal deve fechar com ESC
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);

// Focar primeiro elemento ao abrir
useEffect(() => {
  if (open) {
    const firstInput = modalRef.current?.querySelector('input, button');
    (firstInput as HTMLElement)?.focus();
  }
}, [open]);
```

#### Checklist
- [ ] Adicionar `aria-label` em botões com ícone
- [ ] Adicionar texto visível para status
- [ ] Adicionar `<label>` em todos os inputs
- [ ] Implementar navegação por teclado (Tab, Escape)
- [ ] Testar com leitor de tela
- [ ] Garantir contraste de cores (WCAG AA)

---

## Sprint 5 - Refinamentos

**Duração:** 1 semana
**Foco:** Polimento, documentação, testes finais

### 5.1 Bot - Mostrar Datas Disponíveis em Conflito

**Arquivo:** `bot/src/handlers/flow-handler.js`

```javascript
async handleConfirmReservation(sock, from, text, session) {
  const phone = from.split('@')[0];

  if (text === 'sim' || text === 's') {
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

      const response = await axios.post(`${backendUrl}/api/reservations`, {
        stockItemId: session.data.selectedEquipment.id,
        userName: session.data.contactName || 'Cliente WhatsApp',
        userPhone: phone,
        startTime: session.data.startDate,
        endTime: session.data.endDate,
        notes: session.data.reservationReason || 'Reserva via WhatsApp',
      }, { timeout: 10000 });

      await this.sendMessage(sock, from, config.messages.reservationCreated);

    } catch (error) {
      console.error('❌ Erro ao criar reserva:', error.message);

      if (error.response?.data?.code === 'RESERVATION_CONFLICT') {
        // ✅ BUSCAR PRÓXIMAS DATAS DISPONÍVEIS
        const conflict = error.response.data.details?.conflictingReservation;

        let message = '⚠️ *Esse equipamento já está reservado para o horário solicitado.*\n\n';

        if (conflict) {
          message += `📅 Conflito:\n`;
          message += `De: ${new Date(conflict.startTime).toLocaleString('pt-BR')}\n`;
          message += `Até: ${new Date(conflict.endTime).toLocaleString('pt-BR')}\n`;
          message += `Por: ${conflict.userName}\n\n`;
          message += `💡 *Sugestão:* Tente reservar após ${new Date(conflict.endTime).toLocaleString('pt-BR')}\n\n`;
        }

        message += 'Digite *menu* para tentar novamente com outro horário.';

        await this.sendMessage(sock, from, message);
      } else {
        await this.sendMessage(sock, from, '❌ Erro ao criar reserva. Tente novamente mais tarde.\n\nDigite *menu* para voltar ao início.');
      }
    }
  }

  // ... resto do código
}
```

#### Checklist
- [ ] Extrair detalhes do conflito do erro
- [ ] Mostrar informações da reserva conflitante
- [ ] Sugerir próximo horário disponível
- [ ] Testar mensagem de conflito

---

### 5.2 Backend - Response DTOs

**Arquivo:** `backend/src/presentation/controllers/stock/stock-response.dto.ts`

```typescript
import { Exclude, Expose, Type } from 'class-transformer';

export class StockItemResponseDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  name: string;

  @Expose()
  description?: string;

  @Expose()
  stockType: string;

  @Expose()
  category: string;

  @Expose()
  quantity: number;

  @Expose()
  minQuantity: number;

  @Expose()
  unitCost?: number;

  @Expose()
  assetTag?: string;

  @Expose()
  assetStatus?: string;

  @Expose()
  active: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // ✅ NÃO EXPOR createdBy, updatedBy (dados internos)
  @Exclude()
  createdBy?: string;

  @Exclude()
  updatedBy?: string;

  @Expose()
  @Type(() => ReservationSummaryDto)
  reservations?: ReservationSummaryDto[];
}

export class ReservationSummaryDto {
  @Expose()
  id: string;

  @Expose()
  userName: string;

  @Expose()
  startTime: Date;

  @Expose()
  endTime: Date;

  @Expose()
  status: string;

  // Não expor userPhone, notes
  @Exclude()
  userPhone?: string;
}
```

**Aplicar no Controller:**

```typescript
import { plainToInstance } from 'class-transformer';

@Controller('stock')
export class StockController {

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.stockService.findOne(id);

    // ✅ TRANSFORMAR para DTO de resposta
    return plainToInstance(StockItemResponseDto, item, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(@Query() query: StockQueryDto) {
    const result = await this.stockService.findAll(query);

    return {
      ...result,
      items: plainToInstance(StockItemResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
    };
  }
}
```

#### Checklist
- [ ] Criar Response DTOs para Stock
- [ ] Criar Response DTOs para Reservation
- [ ] Aplicar transformação nos controllers
- [ ] Testar que campos internos não são expostos
- [ ] Documentar DTOs no Swagger

---

### 5.3 Documentação da API

**Arquivo:** `backend/src/main.ts`

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ SWAGGER DOCUMENTATION
  const config = new DocumentBuilder()
    .setTitle('Helpdesk WhatsApp API')
    .setDescription('API do sistema de helpdesk integrado com WhatsApp e GLPI')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação e autorização')
    .addTag('tickets', 'Gestão de tickets')
    .addTag('stock', 'Gestão de estoque')
    .addTag('reservations', 'Reservas de equipamentos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log('📚 Documentação disponível em: http://localhost:3000/api/docs');
}
bootstrap();
```

**Anotar Controllers:**

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {

  @Get(':id')
  @ApiOperation({ summary: 'Buscar item de estoque por ID' })
  @ApiResponse({ status: 200, description: 'Item encontrado', type: StockItemResponseDto })
  @ApiResponse({ status: 404, description: 'Item não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo item de estoque' })
  @ApiResponse({ status: 201, description: 'Item criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  async create(@Body() dto: CreateStockItemDto, @Req() req) {
    const userId = req.user.id;
    return this.stockService.create(dto, userId);
  }
}
```

#### Checklist
- [ ] Instalar `@nestjs/swagger`
- [ ] Configurar Swagger em `main.ts`
- [ ] Adicionar decorators em controllers
- [ ] Adicionar exemplos em DTOs
- [ ] Testar documentação em /api/docs

---

### 5.4 Testes de Integração

**Arquivo:** `backend/test/stock.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('StockController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/stock (GET)', () => {
    it('deve retornar lista de itens com paginação', () => {
      return request(app.getHttpServer())
        .get('/api/stock?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page', 1);
          expect(res.body).toHaveProperty('limit', 10);
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('deve retornar 401 sem autenticação', () => {
      return request(app.getHttpServer())
        .get('/api/stock')
        .expect(401);
    });
  });

  describe('/api/stock (POST)', () => {
    it('deve criar novo item de estoque', () => {
      return request(app.getHttpServer())
        .post('/api/stock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-001',
          name: 'Item de Teste',
          stockType: 'CONSUMABLE',
          category: 'OFFICE',
          quantity: 100,
          minQuantity: 10,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.code).toBe('TEST-001');
        });
    });

    it('deve retornar 400 com dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/api/stock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Faltando campos obrigatórios
          name: 'Incompleto',
        })
        .expect(400);
    });
  });

  // Mais testes...
});
```

#### Checklist
- [ ] Criar testes E2E para StockController
- [ ] Criar testes E2E para ReservationController
- [ ] Testar autenticação e autorização
- [ ] Testar validações
- [ ] Testar conflitos de reserva
- [ ] Executar `npm run test:e2e`

---

## Sprint 6 - Chat Multimídia (Áudio, Vídeo, Imagens)

**Duração:** 1-2 semanas
**Foco:** Comunicação rica entre técnico e usuário

### Visão Geral

Atualmente o chat técnico-usuário só suporta **texto**. Vamos implementar:

| Recurso | Status Atual | Status Futuro |
|---------|--------------|---------------|
| **Texto** | ✅ Funcionando | ✅ Mantém |
| **Imagens** | ⚠️ Bot recebe do WhatsApp, mas não exibe no painel | ✅ Upload/Download/Preview |
| **Áudio** | ❌ Não suportado | ✅ Gravação/Reprodução |
| **Vídeo** | ❌ Não suportado | ✅ Upload/Preview |
| **Chamada de Vídeo** | ❌ Não suportado | ✅ WebRTC P2P |
| **Documentos** | ❌ Não suportado | ✅ PDF, DOCX, XLSX |

---

### 6.1 Backend - Upload e Armazenamento de Mídia

#### 6.1.1 Escolher Storage

**Opções:**

| Opção | Prós | Contras | Recomendação |
|-------|------|---------|--------------|
| **Local (filesystem)** | Grátis, simples | Não escalável, sem backup automático | ❌ Não para produção |
| **MinIO (S3-compatible)** | Open source, compatível com S3, self-hosted | Precisa de servidor adicional | ✅ **Recomendado** |
| **AWS S3** | Escalável, confiável | Pago ($0.023/GB/mês) | ⚠️ Se já usa AWS |
| **Cloudflare R2** | Sem custo de egress | Pago ($0.015/GB/mês) | ⚠️ Alternativa |

**Decisão Sugerida:** **MinIO** (self-hosted, gratuito)

---

#### 6.1.2 Configurar MinIO

**Arquivo:** `docker-compose.dev.yml`

```yaml
services:
  # ... serviços existentes ...

  minio:
    image: minio/minio:latest
    container_name: helpdesk-minio
    ports:
      - "9000:9000"    # API
      - "9001:9001"    # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    networks:
      - helpdesk-network

volumes:
  minio-data:
```

**Criar Bucket:**

```bash
# Acessar http://localhost:9001
# Login: minioadmin / minioadmin123
# Criar bucket: "helpdesk-attachments"
# Configurar política: Public Read (para downloads)
```

---

#### 6.1.3 Integração MinIO no Backend

**Instalar SDK:**

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer
```

**Criar Service:**

**Arquivo:** `backend/src/infrastructure/storage/minio.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private s3Client: S3Client;
  private bucketName = 'helpdesk-attachments';

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
      },
      forcePathStyle: true, // Necessário para MinIO
    });
  }

  /**
   * Upload de arquivo
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'attachments',
  ): Promise<{ key: string; url: string }> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    const url = `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/${this.bucketName}/${fileName}`;

    this.logger.log(`Arquivo enviado: ${fileName}`);

    return { key: fileName, url };
  }

  /**
   * Gerar URL assinada (para downloads privados)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Deletar arquivo
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`Arquivo deletado: ${key}`);
  }

  /**
   * Upload de arquivo do WhatsApp (base64 ou stream)
   */
  async uploadFromWhatsApp(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
  ): Promise<{ key: string; url: string }> {
    const extension = mimetype.split('/')[1] || 'bin';
    const fileName = `whatsapp/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: mimetype,
      Metadata: {
        originalName,
        source: 'whatsapp',
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    const url = `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/${this.bucketName}/${fileName}`;

    return { key: fileName, url };
  }
}
```

**Registrar no AppModule:**

```typescript
// app.module.ts
import { MinioService } from './infrastructure/storage/minio.service';

@Module({
  imports: [
    // ... outros imports
  ],
  providers: [
    MinioService,
    // ... outros providers
  ],
})
export class AppModule {}
```

---

#### 6.1.4 Atualizar Schema Prisma - Attachment Model

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model Attachment {
  id            String   @id @default(uuid())
  ticketId      String?
  ticket        Ticket?  @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  messageId     String?
  message       Message? @relation(fields: [messageId], references: [id], onDelete: Cascade)

  fileName      String   // Nome original do arquivo
  fileKey       String   // Chave no MinIO (path completo)
  fileUrl       String   // URL pública ou assinada
  fileSize      Int      // Tamanho em bytes
  mimeType      String   // image/jpeg, audio/ogg, video/mp4, etc
  fileType      String   // image, audio, video, document

  uploadedBy    String?
  uploadedByUser User?   @relation(fields: [uploadedBy], references: [id])

  createdAt     DateTime @default(now())

  @@index([ticketId])
  @@index([messageId])
  @@index([fileType])
}

// Atualizar model Message para incluir relação
model Message {
  id                String       @id @default(uuid())
  // ... campos existentes ...

  attachments       Attachment[] // ✅ ADICIONAR

  // ... resto do model
}

// Atualizar model Ticket
model Ticket {
  id                String       @id @default(uuid())
  // ... campos existentes ...

  attachments       Attachment[] // ✅ ADICIONAR (anexos gerais do ticket)

  // ... resto do model
}
```

**Criar Migration:**

```bash
cd backend
npx prisma migrate dev --name add_attachments_support
```

---

#### 6.1.5 Controller de Upload

**Arquivo:** `backend/src/presentation/controllers/attachments/attachments.controller.ts`

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { MinioService } from '../../../infrastructure/storage/minio.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('attachments')
@UseGuards(AuthGuard('jwt'))
export class AttachmentsController {
  constructor(
    private minioService: MinioService,
    private prisma: PrismaService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, cb) => {
        // Tipos permitidos
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'audio/mpeg',
          'audio/ogg',
          'audio/wav',
          'audio/webm',
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de arquivo não permitido'), false);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    // Upload para MinIO
    const { key, url } = await this.minioService.uploadFile(file, 'chat-attachments');

    // Determinar tipo de arquivo
    const fileType = this.getFileType(file.mimetype);

    // Salvar metadados no banco
    const attachment = await this.prisma.attachment.create({
      data: {
        fileName: file.originalname,
        fileKey: key,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType,
        uploadedBy: req.user.id,
      },
    });

    return attachment;
  }

  @Get(':id')
  async getAttachment(@Param('id') id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new BadRequestException('Anexo não encontrado');
    }

    // Gerar URL assinada se necessário
    const signedUrl = await this.minioService.getSignedUrl(attachment.fileKey);

    return {
      ...attachment,
      downloadUrl: signedUrl,
    };
  }

  @Delete(':id')
  async deleteAttachment(@Param('id') id: string, @Req() req) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new BadRequestException('Anexo não encontrado');
    }

    // Verificar permissão (apenas quem enviou ou admin)
    if (attachment.uploadedBy !== req.user.id && req.user.role !== 'ADMIN') {
      throw new BadRequestException('Sem permissão para deletar este arquivo');
    }

    // Deletar do MinIO
    await this.minioService.deleteFile(attachment.fileKey);

    // Deletar do banco
    await this.prisma.attachment.delete({
      where: { id },
    });

    return { message: 'Anexo deletado com sucesso' };
  }

  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.startsWith('video/')) return 'video';
    return 'document';
  }
}
```

---

#### 6.1.6 Atualizar Messages Service

**Arquivo:** `backend/src/presentation/controllers/messages/messages.service.ts`

```typescript
async createMessage(dto: CreateMessageDto, attachments?: string[]): Promise<Message> {
  const message = await this.prisma.message.create({
    data: {
      ticketId: dto.ticketId,
      content: dto.content,
      direction: dto.direction,
      senderId: dto.senderId,
      // ... outros campos
    },
  });

  // Se houver anexos, vincular à mensagem
  if (attachments && attachments.length > 0) {
    await this.prisma.attachment.updateMany({
      where: { id: { in: attachments } },
      data: { messageId: message.id },
    });
  }

  return this.prisma.message.findUnique({
    where: { id: message.id },
    include: { attachments: true },
  });
}
```

---

### 6.2 Bot - Receber e Processar Mídia do WhatsApp

#### 6.2.1 Atualizar WhatsApp Handler

**Arquivo:** `bot/src/handlers/flow-handler.js`

```javascript
async handleWaitingTechnician(sock, from, text, session, msg) {
  const phone = from.split('@')[0];

  // ✅ PROCESSAR DIFERENTES TIPOS DE MÍDIA
  const message = msg?.message;

  // 1. IMAGEM
  if (message?.imageMessage) {
    await this.handleMediaReceived(sock, from, msg, session, 'image');
    return;
  }

  // 2. ÁUDIO
  if (message?.audioMessage) {
    await this.handleMediaReceived(sock, from, msg, session, 'audio');
    return;
  }

  // 3. VÍDEO
  if (message?.videoMessage) {
    await this.handleMediaReceived(sock, from, msg, session, 'video');
    return;
  }

  // 4. DOCUMENTO
  if (message?.documentMessage) {
    await this.handleMediaReceived(sock, from, msg, session, 'document');
    return;
  }

  // 5. TEXTO (padrão)
  await rabbitmqService.publishIncomingMessage(from, text, msg.key?.id);
}

/**
 * Processar mídia recebida do WhatsApp
 */
async handleMediaReceived(sock, from, msg, session, mediaType) {
  const phone = from.split('@')[0];

  try {
    // Baixar mídia do WhatsApp
    const buffer = await sock.downloadMediaMessage(msg);

    const mediaMessage = msg.message[`${mediaType}Message`];
    const mimetype = mediaMessage?.mimetype;
    const caption = mediaMessage?.caption || '';
    const fileName = mediaMessage?.fileName || `${mediaType}_${Date.now()}`;

    // Enviar para backend processar e salvar no MinIO
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    // Converter buffer para base64 para enviar via HTTP
    const base64Media = buffer.toString('base64');

    const response = await axios.post(`${backendUrl}/api/attachments/from-whatsapp`, {
      phone,
      ticketId: session?.data?.ticketId,
      mediaType,
      mimetype,
      fileName,
      caption,
      base64Data: base64Media,
    }, {
      timeout: 30000, // 30 segundos para upload
    });

    const attachment = response.data;

    // Publicar mensagem com anexo no RabbitMQ
    await rabbitmqService.publishIncomingMessage(
      from,
      caption || `[${mediaType.toUpperCase()}]`,
      msg.key?.id,
      {
        attachmentId: attachment.id,
        attachmentUrl: attachment.fileUrl,
        mediaType,
      }
    );

    // Confirmar recebimento ao usuário
    const mediaEmoji = {
      image: '📷',
      audio: '🎤',
      video: '🎥',
      document: '📄',
    };

    await this.sendMessage(
      sock,
      from,
      `${mediaEmoji[mediaType]} ${mediaType === 'image' ? 'Imagem' : mediaType === 'audio' ? 'Áudio' : mediaType === 'video' ? 'Vídeo' : 'Documento'} recebido! O técnico poderá visualizá-lo.`
    );

  } catch (error) {
    console.error(`❌ Erro ao processar ${mediaType}:`, error.message);
    await this.sendMessage(
      sock,
      from,
      `❌ Erro ao receber ${mediaType}. Tente novamente.`
    );
  }
}
```

---

#### 6.2.2 Criar Endpoint para WhatsApp Upload

**Arquivo:** `backend/src/presentation/controllers/attachments/attachments.controller.ts`

```typescript
@Post('from-whatsapp')
async uploadFromWhatsApp(@Body() dto: WhatsAppMediaDto, @Req() req) {
  // Validar dados
  if (!dto.base64Data) {
    throw new BadRequestException('Dados de mídia não fornecidos');
  }

  // Converter base64 para buffer
  const buffer = Buffer.from(dto.base64Data, 'base64');

  // Upload para MinIO
  const { key, url } = await this.minioService.uploadFromWhatsApp(
    buffer,
    dto.mimetype,
    dto.fileName,
  );

  // Salvar no banco
  const attachment = await this.prisma.attachment.create({
    data: {
      fileName: dto.fileName,
      fileKey: key,
      fileUrl: url,
      fileSize: buffer.length,
      mimeType: dto.mimetype,
      fileType: dto.mediaType,
      ticketId: dto.ticketId,
    },
  });

  return attachment;
}
```

**DTO:**

```typescript
export class WhatsAppMediaDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  ticketId?: string;

  @IsEnum(['image', 'audio', 'video', 'document'])
  mediaType: string;

  @IsString()
  mimetype: string;

  @IsString()
  fileName: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsString()
  base64Data: string;
}
```

---

### 6.3 Frontend - Interface de Chat com Mídia

#### 6.3.1 Componente de Upload

**Arquivo:** `frontend/src/app/components/MediaUpload.tsx`

```typescript
import { useRef, useState } from 'react';
import { Upload, Image, Mic, Video, File } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface MediaUploadProps {
  onUploadComplete: (attachmentId: string) => void;
}

export function MediaUpload({ onUploadComplete }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 50MB');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          toast.loading(`Enviando: ${progress}%`, { id: 'upload' });
        },
      });

      toast.dismiss('upload');
      toast.success('Arquivo enviado!');

      onUploadComplete(response.data.id);

    } catch (error) {
      toast.dismiss('upload');
      toast.error('Erro ao enviar arquivo');
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="p-2 rounded-lg hover:bg-gray-100 transition"
        title="Enviar arquivo"
      >
        {uploading ? (
          <div className="animate-spin">⏳</div>
        ) : (
          <Upload size={20} />
        )}
      </button>
    </div>
  );
}
```

---

#### 6.3.2 Componente de Preview de Mídia

**Arquivo:** `frontend/src/app/components/AttachmentPreview.tsx`

```typescript
import { Download, X } from 'lucide-react';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'audio' | 'video' | 'document';
  fileSize: number;
  mimeType: string;
}

interface AttachmentPreviewProps {
  attachment: Attachment;
  onClose?: () => void;
}

export function AttachmentPreview({ attachment, onClose }: AttachmentPreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderPreview = () => {
    switch (attachment.fileType) {
      case 'image':
        return (
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName}
            className="max-w-full max-h-96 rounded-lg"
          />
        );

      case 'audio':
        return (
          <audio controls className="w-full">
            <source src={attachment.fileUrl} type={attachment.mimeType} />
            Seu navegador não suporta áudio.
          </audio>
        );

      case 'video':
        return (
          <video controls className="max-w-full max-h-96 rounded-lg">
            <source src={attachment.fileUrl} type={attachment.mimeType} />
            Seu navegador não suporta vídeo.
          </video>
        );

      case 'document':
        return (
          <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg">
            <div className="text-4xl">📄</div>
            <div className="flex-1">
              <p className="font-medium">{attachment.fileName}</p>
              <p className="text-sm text-gray-600">{formatFileSize(attachment.fileSize)}</p>
            </div>
            <a
              href={attachment.fileUrl}
              download={attachment.fileName}
              className="p-2 hover:bg-gray-200 rounded"
              title="Download"
            >
              <Download size={20} />
            </a>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
        >
          <X size={16} />
        </button>
      )}
      {renderPreview()}
    </div>
  );
}
```

---

#### 6.3.3 Integrar no ChatView

**Arquivo:** `frontend/src/app/components/ChatView.tsx`

```typescript
import { MediaUpload } from './MediaUpload';
import { AttachmentPreview } from './AttachmentPreview';
import { Message, Attachment } from '../types';

function ChatView({ ticket }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);

  const handleUploadComplete = (attachmentId: string) => {
    setPendingAttachments((prev) => [...prev, attachmentId]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && pendingAttachments.length === 0) return;

    try {
      await api.post('/messages', {
        ticketId: ticket.id,
        content: newMessage,
        direction: 'OUTGOING',
        attachments: pendingAttachments,
      });

      setNewMessage('');
      setPendingAttachments([]);
      fetchMessages(); // Atualizar lista

    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2>{ticket.customerName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] p-3 rounded-lg ${
              message.direction === 'OUTGOING' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              {/* Attachments */}
              {message.attachments?.map((attachment) => (
                <AttachmentPreview key={attachment.id} attachment={attachment} />
              ))}

              {/* Text */}
              {message.content && <p>{message.content}</p>}

              <span className="text-xs opacity-70">
                {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t flex gap-2">
        <MediaUpload onUploadComplete={handleUploadComplete} />

        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Digite sua mensagem..."
          className="flex-1 px-4 py-2 border rounded-lg"
        />

        <button
          onClick={handleSendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
```

---

### 6.4 Chamada de Vídeo (WebRTC)

#### 6.4.1 Escolher Solução

| Opção | Prós | Contras | Recomendação |
|-------|------|---------|--------------|
| **WebRTC Puro** | Gratuito, P2P direto | Complexo implementar, precisa TURN server | ⚠️ Se tem experiência |
| **Daily.co** | SDK simples, free tier (10k minutos/mês) | Pago após limite | ✅ **Recomendado** |
| **Jitsi Meet** | Open source, self-hosted | Precisa servidor dedicado | ✅ Se quer self-hosted |
| **Whereby** | Simples, embedded iframe | Pago ($9.99/mês) | ⚠️ Alternativa |

**Decisão Sugerida:** **Daily.co** (free tier generoso)

---

#### 6.4.2 Implementar com Daily.co

**Instalar SDK:**

```bash
cd frontend
npm install @daily-co/daily-js
```

**Componente de Chamada:**

**Arquivo:** `frontend/src/app/components/VideoCall.tsx`

```typescript
import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Video, VideoOff, Phone } from 'lucide-react';

interface VideoCallProps {
  roomUrl: string;
  onLeave: () => void;
}

export function VideoCall({ roomUrl, onLeave }: VideoCallProps) {
  const callFrameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [callState, setCallState] = useState<'idle' | 'joining' | 'joined' | 'error'>('idle');

  useEffect(() => {
    if (!containerRef.current) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton: true,
      iframeStyle: {
        width: '100%',
        height: '600px',
        border: 'none',
        borderRadius: '8px',
      },
    });

    callFrameRef.current = callFrame;

    // Eventos
    callFrame.on('joined-meeting', () => {
      setCallState('joined');
    });

    callFrame.on('left-meeting', () => {
      setCallState('idle');
      onLeave();
    });

    callFrame.on('error', (e) => {
      console.error('Erro na chamada:', e);
      setCallState('error');
    });

    // Entrar na sala
    setCallState('joining');
    callFrame.join({ url: roomUrl });

    return () => {
      callFrame.destroy();
    };
  }, [roomUrl, onLeave]);

  const handleLeave = () => {
    callFrameRef.current?.leave();
  };

  return (
    <div className="relative">
      {callState === 'joining' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p>Conectando...</p>
          </div>
        </div>
      )}

      {callState === 'error' && (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg">
          ❌ Erro ao conectar à chamada. Tente novamente.
        </div>
      )}

      <div ref={containerRef} />

      <button
        onClick={handleLeave}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg flex items-center gap-2"
      >
        <Phone size={20} />
        Desligar
      </button>
    </div>
  );
}
```

---

#### 6.4.3 Backend - Criar Sala de Vídeo

**Criar conta Daily.co:**
1. Acessar https://www.daily.co/
2. Criar conta gratuita
3. Pegar API Key

**Instalar SDK:**

```bash
cd backend
npm install @daily-co/daily-js
```

**Service:**

**Arquivo:** `backend/src/infrastructure/services/daily.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private apiKey = process.env.DAILY_API_KEY;
  private baseUrl = 'https://api.daily.co/v1';

  async createRoom(ticketId: string): Promise<{ roomUrl: string; roomName: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/rooms`,
        {
          name: `ticket-${ticketId}-${Date.now()}`,
          privacy: 'private',
          properties: {
            enable_screenshare: true,
            enable_chat: false, // Já tem chat próprio
            max_participants: 2, // Apenas técnico e cliente
            exp: Math.floor(Date.now() / 1000) + 3600, // Expira em 1 hora
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Sala criada: ${response.data.name}`);

      return {
        roomUrl: response.data.url,
        roomName: response.data.name,
      };

    } catch (error) {
      this.logger.error('Erro ao criar sala Daily.co:', error.message);
      throw error;
    }
  }

  async deleteRoom(roomName: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/rooms/${roomName}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      this.logger.log(`Sala deletada: ${roomName}`);

    } catch (error) {
      this.logger.error('Erro ao deletar sala:', error.message);
    }
  }
}
```

**Controller:**

```typescript
@Controller('video-calls')
@UseGuards(AuthGuard('jwt'))
export class VideoCallsController {
  constructor(private dailyService: DailyService) {}

  @Post('create/:ticketId')
  async createVideoCall(@Param('ticketId') ticketId: string) {
    const { roomUrl, roomName } = await this.dailyService.createRoom(ticketId);

    // Salvar no banco (opcional)
    // await this.prisma.videoCall.create({ ticketId, roomUrl, roomName });

    // Notificar via WebSocket que chamada foi iniciada
    // this.notificationGateway.notifyVideoCallStarted(ticketId, roomUrl);

    return { roomUrl, roomName };
  }

  @Delete(':roomName')
  async endVideoCall(@Param('roomName') roomName: string) {
    await this.dailyService.deleteRoom(roomName);
    return { message: 'Chamada encerrada' };
  }
}
```

---

### 6.5 Gravação de Áudio no Frontend

**Instalar biblioteca:**

```bash
npm install recordrtc
```

**Componente:**

**Arquivo:** `frontend/src/app/components/AudioRecorder.tsx`

```typescript
import { useState, useRef } from 'react';
import RecordRTC from 'recordrtc';
import { Mic, Square, Trash2, Send } from 'lucide-react';

interface AudioRecorderProps {
  onRecordComplete: (audioBlob: Blob) => void;
}

export function AudioRecorder({ onRecordComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const recorderRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);

      // Timer de duração
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Permita o acesso ao microfone');
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      const url = URL.createObjectURL(blob);

      setAudioBlob(blob);
      setAudioUrl(url);
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Parar stream
      recorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    });
  };

  const handleSend = () => {
    if (audioBlob) {
      onRecordComplete(audioBlob);
      handleClear();
    }
  };

  const handleClear = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {!audioBlob ? (
        <>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-lg ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-gray-100'
            }`}
            title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
          >
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </button>

          {isRecording && (
            <span className="text-sm text-red-500 font-mono">
              🔴 {formatDuration(duration)}
            </span>
          )}
        </>
      ) : (
        <>
          <audio src={audioUrl!} controls className="h-10" />

          <button
            onClick={handleSend}
            className="p-2 bg-blue-500 text-white rounded-lg"
            title="Enviar áudio"
          >
            <Send size={20} />
          </button>

          <button
            onClick={handleClear}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Descartar"
          >
            <Trash2 size={20} />
          </button>
        </>
      )}
    </div>
  );
}
```

**Integrar no ChatView:**

```typescript
import { AudioRecorder } from './AudioRecorder';

function ChatView() {
  const handleAudioRecorded = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, `audio_${Date.now()}.webm`);

    try {
      const response = await api.post('/attachments/upload', formData);

      await api.post('/messages', {
        ticketId: ticket.id,
        content: '[ÁUDIO]',
        direction: 'OUTGOING',
        attachments: [response.data.id],
      });

      toast.success('Áudio enviado!');
      fetchMessages();

    } catch (error) {
      toast.error('Erro ao enviar áudio');
    }
  };

  return (
    <div className="p-4 border-t flex gap-2">
      <MediaUpload onUploadComplete={handleUploadComplete} />
      <AudioRecorder onRecordComplete={handleAudioRecorded} />

      {/* Input de texto */}
    </div>
  );
}
```

---

### 6.6 WebSocket - Notificações em Tempo Real

**Atualizar Gateway para notificar sobre mídia:**

**Arquivo:** `backend/src/presentation/websockets/notification.gateway.ts`

```typescript
@WebSocketGateway({ cors: true })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  // Notificar que nova mensagem com mídia chegou
  notifyNewMessage(ticketId: string, message: Message) {
    this.server.to(`ticket-${ticketId}`).emit('new-message', message);
  }

  // Notificar início de chamada de vídeo
  notifyVideoCallStarted(ticketId: string, roomUrl: string) {
    this.server.to(`ticket-${ticketId}`).emit('video-call-started', {
      ticketId,
      roomUrl,
    });
  }
}
```

**Frontend - Escutar eventos:**

```typescript
useEffect(() => {
  socket.on('new-message', (message: Message) => {
    setMessages((prev) => [...prev, message]);

    // Se tem anexo, tocar som de notificação
    if (message.attachments?.length > 0) {
      new Audio('/notification.mp3').play();
    }
  });

  socket.on('video-call-started', ({ roomUrl }) => {
    const accept = confirm('O técnico iniciou uma chamada de vídeo. Deseja participar?');
    if (accept) {
      setVideoCallUrl(roomUrl);
      setShowVideoCall(true);
    }
  });

  return () => {
    socket.off('new-message');
    socket.off('video-call-started');
  };
}, []);
```

---

### Checklist Geral - Sprint 6

#### Backend
- [ ] Configurar MinIO no docker-compose
- [ ] Criar `MinioService`
- [ ] Adicionar model `Attachment` no Prisma
- [ ] Criar migration
- [ ] Criar `AttachmentsController` (upload, download, delete)
- [ ] Criar endpoint `/from-whatsapp` para mídia do bot
- [ ] Atualizar `MessagesService` para vincular attachments
- [ ] Criar `DailyService` para chamadas de vídeo
- [ ] Criar `VideoCallsController`
- [ ] Atualizar Gateway para notificar mídia

#### Bot
- [ ] Atualizar `handleWaitingTechnician` para detectar mídia
- [ ] Criar `handleMediaReceived` genérico
- [ ] Implementar download de mídia do WhatsApp
- [ ] Enviar mídia para backend via base64

#### Frontend
- [ ] Criar `MediaUpload` component
- [ ] Criar `AttachmentPreview` component (image, audio, video, document)
- [ ] Criar `AudioRecorder` component
- [ ] Criar `VideoCall` component (Daily.co)
- [ ] Integrar tudo no `ChatView`
- [ ] Adicionar WebSocket listeners para mídia
- [ ] Testar upload/download de diferentes tipos

#### Testes
- [ ] Upload de imagem (frontend → backend → MinIO)
- [ ] Envio de foto via WhatsApp (bot → backend → painel)
- [ ] Envio de áudio via WhatsApp
- [ ] Envio de vídeo via WhatsApp
- [ ] Gravação de áudio no painel
- [ ] Upload de documento PDF
- [ ] Chamada de vídeo técnico ↔ usuário
- [ ] Preview correto de cada tipo de mídia
- [ ] Download de arquivos
- [ ] Notificação em tempo real

---

## Sprint 7 - Notificações Multi-Canal para Técnicos

**Duração:** 1 semana
**Foco:** Alertas em tempo real quando houver novo chamado ou mensagem

### Visão Geral

Atualmente, técnicos precisam **verificar manualmente** o painel para ver novos tickets/mensagens. Vamos implementar notificações **proativas** em múltiplos canais:

| Canal | Quando Notificar | Status Atual | Status Futuro |
|-------|------------------|--------------|---------------|
| **WebSocket (Painel)** | Novo ticket, nova mensagem | ⚠️ Parcial | ✅ Completo + Som |
| **WhatsApp (Técnico)** | Novo ticket urgente | ❌ Não existe | ✅ Mensagem ao técnico |
| **Desktop Push** | Nova mensagem/ticket | ❌ Não existe | ✅ Web Push API |
| **E-mail** | Ticket crítico | ❌ Não existe | ✅ SMTP |
| **Telegram (Opcional)** | Alertas prioritários | ❌ Não existe | ⚠️ Opcional |

---

### 7.1 Backend - Sistema de Notificações

#### 7.1.1 Criar Enum de Eventos

**Arquivo:** `backend/src/domain/enums/notification-event.enum.ts`

```typescript
export enum NotificationEvent {
  // Tickets
  NEW_TICKET = 'NEW_TICKET',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_ESCALATED = 'TICKET_ESCALATED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',

  // Mensagens
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEW_MESSAGE_URGENT = 'NEW_MESSAGE_URGENT',

  // Técnicos
  HUMAN_REQUESTED = 'HUMAN_REQUESTED',

  // Reservas
  NEW_RESERVATION = 'NEW_RESERVATION',
  RESERVATION_APPROVED = 'RESERVATION_APPROVED',

  // Sistema
  SLA_EXPIRING = 'SLA_EXPIRING',
  SLA_VIOLATED = 'SLA_VIOLATED',
}

export enum NotificationChannel {
  WEBSOCKET = 'WEBSOCKET',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  TELEGRAM = 'TELEGRAM',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
```

---

#### 7.1.2 Criar Model de Preferências

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model NotificationPreference {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Canais habilitados
  websocketEnabled  Boolean @default(true)
  whatsappEnabled   Boolean @default(true)
  pushEnabled       Boolean @default(true)
  emailEnabled      Boolean @default(false)
  telegramEnabled   Boolean @default(false)

  // Configuração por evento
  newTicketChannels       String[] // ['WEBSOCKET', 'WHATSAPP']
  newMessageChannels      String[] // ['WEBSOCKET', 'PUSH']
  urgentTicketChannels    String[] // ['WEBSOCKET', 'WHATSAPP', 'PUSH', 'EMAIL']

  // Quiet Hours (não notificar)
  quietHoursEnabled Boolean @default(false)
  quietHoursStart   String?  // "22:00"
  quietHoursEnd     String?  // "08:00"

  // Contatos
  whatsappNumber    String?
  telegramChatId    String?
  email             String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId])
  @@index([userId])
}

model NotificationLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])

  event       String   // NotificationEvent
  channel     String   // NotificationChannel
  priority    String   // NotificationPriority

  title       String
  message     String
  data        Json?    // Dados adicionais

  sent        Boolean  @default(false)
  sentAt      DateTime?
  error       String?  // Se falhou ao enviar

  createdAt   DateTime @default(now())

  @@index([userId, event])
  @@index([sent, createdAt])
}
```

**Migration:**

```bash
npx prisma migrate dev --name add_notification_system
```

---

#### 7.1.3 Service de Notificações

**Arquivo:** `backend/src/infrastructure/services/notification.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationGateway } from '../../presentation/websockets/notification.gateway';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';
import {
  NotificationEvent,
  NotificationChannel,
  NotificationPriority
} from '../../domain/enums/notification-event.enum';

interface NotificationPayload {
  event: NotificationEvent;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: any;
  targetUsers?: string[]; // IDs dos técnicos a notificar
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private whatsappService: WhatsAppService,
    private emailService: EmailService,
  ) {}

  /**
   * Enviar notificação (detecta canais automaticamente por preferências)
   */
  async send(payload: NotificationPayload): Promise<void> {
    try {
      // Se não especificou usuários, notificar todos os técnicos disponíveis
      const targetUsers = payload.targetUsers || await this.getAvailableTechnicians();

      for (const userId of targetUsers) {
        // Buscar preferências do usuário
        const preferences = await this.getUserPreferences(userId);

        // Verificar quiet hours
        if (this.isQuietHours(preferences)) {
          this.logger.debug(`Usuário ${userId} em quiet hours, pulando notificação`);
          continue;
        }

        // Determinar canais para este evento
        const channels = this.getChannelsForEvent(payload.event, preferences);

        // Enviar em cada canal habilitado
        for (const channel of channels) {
          await this.sendToChannel(userId, channel, payload);
        }
      }

    } catch (error) {
      this.logger.error('Erro ao enviar notificações:', error);
    }
  }

  /**
   * Enviar notificação em canal específico
   */
  private async sendToChannel(
    userId: string,
    channel: NotificationChannel,
    payload: NotificationPayload,
  ): Promise<void> {
    const logEntry = await this.prisma.notificationLog.create({
      data: {
        userId,
        event: payload.event,
        channel,
        priority: payload.priority,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        sent: false,
      },
    });

    try {
      switch (channel) {
        case NotificationChannel.WEBSOCKET:
          await this.sendWebSocket(userId, payload);
          break;

        case NotificationChannel.WHATSAPP:
          await this.sendWhatsApp(userId, payload);
          break;

        case NotificationChannel.PUSH:
          await this.sendPush(userId, payload);
          break;

        case NotificationChannel.EMAIL:
          await this.sendEmail(userId, payload);
          break;

        case NotificationChannel.TELEGRAM:
          await this.sendTelegram(userId, payload);
          break;
      }

      // Marcar como enviado
      await this.prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { sent: true, sentAt: new Date() },
      });

    } catch (error) {
      this.logger.error(`Erro ao enviar via ${channel}:`, error);

      await this.prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { error: error.message },
      });
    }
  }

  /**
   * WebSocket (tempo real no painel)
   */
  private async sendWebSocket(userId: string, payload: NotificationPayload): Promise<void> {
    this.notificationGateway.sendToUser(userId, {
      type: payload.event,
      priority: payload.priority,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`WebSocket enviado para ${userId}: ${payload.title}`);
  }

  /**
   * WhatsApp (para número do técnico)
   */
  private async sendWhatsApp(userId: string, payload: NotificationPayload): Promise<void> {
    const preferences = await this.getUserPreferences(userId);

    if (!preferences.whatsappNumber) {
      throw new Error('Técnico não tem WhatsApp cadastrado');
    }

    const priorityEmoji = {
      LOW: 'ℹ️',
      NORMAL: '📋',
      HIGH: '⚠️',
      URGENT: '🚨',
    };

    const message = `${priorityEmoji[payload.priority]} *${payload.title}*\n\n${payload.message}`;

    await this.whatsappService.sendMessage(preferences.whatsappNumber, message);

    this.logger.log(`WhatsApp enviado para ${userId}: ${payload.title}`);
  }

  /**
   * Web Push (notificação desktop)
   */
  private async sendPush(userId: string, payload: NotificationPayload): Promise<void> {
    // Buscar push subscriptions do usuário
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, active: true },
    });

    if (subscriptions.length === 0) {
      throw new Error('Usuário não tem push subscription');
    }

    const webpush = require('web-push');

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: '/logo.png',
      badge: '/badge.png',
      data: payload.data,
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, notification);
      } catch (error) {
        // Se subscription expirou, remover
        if (error.statusCode === 410) {
          await this.prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { active: false },
          });
        }
      }
    }

    this.logger.log(`Push enviado para ${userId}: ${payload.title}`);
  }

  /**
   * E-mail
   */
  private async sendEmail(userId: string, payload: NotificationPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.email) {
      throw new Error('Usuário não tem e-mail');
    }

    await this.emailService.send({
      to: user.email,
      subject: `[Helpdesk] ${payload.title}`,
      html: `
        <h2>${payload.title}</h2>
        <p>${payload.message}</p>
        <br>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard">
          Acessar Painel
        </a>
      `,
    });

    this.logger.log(`E-mail enviado para ${userId}: ${payload.title}`);
  }

  /**
   * Telegram (opcional)
   */
  private async sendTelegram(userId: string, payload: NotificationPayload): Promise<void> {
    const preferences = await this.getUserPreferences(userId);

    if (!preferences.telegramChatId) {
      throw new Error('Usuário não tem Telegram configurado');
    }

    const axios = require('axios');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: preferences.telegramChatId,
      text: `*${payload.title}*\n\n${payload.message}`,
      parse_mode: 'Markdown',
    });

    this.logger.log(`Telegram enviado para ${userId}: ${payload.title}`);
  }

  /**
   * Helpers
   */
  private async getUserPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Criar preferências padrão se não existir
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          newTicketChannels: ['WEBSOCKET', 'WHATSAPP'],
          newMessageChannels: ['WEBSOCKET', 'PUSH'],
          urgentTicketChannels: ['WEBSOCKET', 'WHATSAPP', 'PUSH'],
        },
      });
    }

    return preferences;
  }

  private getChannelsForEvent(
    event: NotificationEvent,
    preferences: any,
  ): NotificationChannel[] {
    const mapping = {
      [NotificationEvent.NEW_TICKET]: preferences.newTicketChannels,
      [NotificationEvent.NEW_MESSAGE]: preferences.newMessageChannels,
      [NotificationEvent.NEW_MESSAGE_URGENT]: preferences.urgentTicketChannels,
      [NotificationEvent.HUMAN_REQUESTED]: preferences.urgentTicketChannels,
    };

    return (mapping[event] || ['WEBSOCKET']).filter((channel: string) => {
      // Verificar se canal está habilitado globalmente
      return preferences[`${channel.toLowerCase()}Enabled`];
    });
  }

  private isQuietHours(preferences: any): boolean {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = preferences.quietHoursStart || '22:00';
    const end = preferences.quietHoursEnd || '08:00';

    // Se start > end (ex: 22:00 - 08:00), período cruza meia-noite
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  private async getAvailableTechnicians(): Promise<string[]> {
    const technicians = await this.prisma.user.findMany({
      where: {
        role: { in: ['AGENT', 'ADMIN'] },
        active: true,
      },
      select: { id: true },
    });

    return technicians.map((t) => t.id);
  }
}
```

---

#### 7.1.4 Integrar com Eventos Existentes

**Arquivo:** `backend/src/presentation/controllers/tickets/tickets.service.ts`

```typescript
import { NotificationService } from '../../../infrastructure/services/notification.service';
import { NotificationEvent, NotificationPriority } from '../../../domain/enums/notification-event.enum';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService, // ✅ INJETAR
  ) {}

  async create(dto: CreateTicketDto): Promise<Ticket> {
    const ticket = await this.prisma.ticket.create({
      data: dto,
    });

    // ✅ NOTIFICAR TÉCNICOS
    await this.notificationService.send({
      event: NotificationEvent.NEW_TICKET,
      priority: dto.priority === 'CRITICAL' ? NotificationPriority.URGENT : NotificationPriority.NORMAL,
      title: 'Novo Chamado',
      message: `#${ticket.glpiId || ticket.id} - ${ticket.title} (${dto.customerName})`,
      data: { ticketId: ticket.id },
    });

    return ticket;
  }

  async assignTicket(ticketId: string, technicianId: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedTo: technicianId },
    });

    // ✅ NOTIFICAR TÉCNICO ATRIBUÍDO
    await this.notificationService.send({
      event: NotificationEvent.TICKET_ASSIGNED,
      priority: NotificationPriority.HIGH,
      title: 'Chamado Atribuído',
      message: `Você foi atribuído ao ticket #${ticket.glpiId}`,
      data: { ticketId: ticket.id },
      targetUsers: [technicianId], // Apenas o técnico atribuído
    });

    return ticket;
  }
}
```

**Arquivo:** `backend/src/infrastructure/services/incoming-messages.consumer.ts`

```typescript
async processMessage(data: any) {
  const { phoneNumber, content } = data;

  // Criar mensagem...
  const result = await this.messagesService.createFromWhatsApp(phoneNumber, content);

  if (result.isNew) {
    const ticket = await this.ticketsService.findOne(result.message.ticketId);

    // ✅ NOTIFICAR TÉCNICO RESPONSÁVEL
    if (ticket.assignedToId) {
      await this.notificationService.send({
        event: NotificationEvent.NEW_MESSAGE,
        priority: NotificationPriority.NORMAL,
        title: 'Nova Mensagem',
        message: `${ticket.customerName}: ${content.substring(0, 50)}...`,
        data: { ticketId: ticket.id, messageId: result.message.id },
        targetUsers: [ticket.assignedToId],
      });
    }
  }
}
```

---

### 7.2 Frontend - Notificações Desktop (Web Push)

#### 7.2.1 Configurar Web Push

**Gerar VAPID Keys:**

```bash
npx web-push generate-vapid-keys
```

Salvar no `.env`:

```env
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
```

---

#### 7.2.2 Service Worker

**Arquivo:** `frontend/public/sw.js`

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/badge.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    const ticketId = event.notification.data?.ticketId;
    const url = ticketId
      ? `/dashboard/chat?ticket=${ticketId}`
      : '/dashboard';

    event.waitUntil(
      clients.openWindow(url)
    );
  }
});
```

---

#### 7.2.3 Hook de Notificações

**Arquivo:** `frontend/src/app/hooks/useNotifications.ts`

```typescript
import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      await subscribeToPush();
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });

      // Enviar subscription para backend
      await api.post('/notifications/subscribe', {
        subscription: JSON.stringify(sub),
      });

      setSubscription(sub);

    } catch (error) {
      console.error('Erro ao se inscrever em push:', error);
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
  };
}
```

---

#### 7.2.4 Componente de Configuração

**Arquivo:** `frontend/src/app/views/NotificationSettings.tsx`

```typescript
import { useNotifications } from '../hooks/useNotifications';
import { Bell, BellOff } from 'lucide-react';

export function NotificationSettings() {
  const { permission, requestPermission } = useNotifications();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Configurações de Notificações</h2>

      <div className="space-y-4">
        {/* Desktop Push */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bell size={24} />
            <div>
              <h3 className="font-medium">Notificações Desktop</h3>
              <p className="text-sm text-gray-600">
                Receba alertas mesmo com o navegador minimizado
              </p>
            </div>
          </div>

          {permission === 'granted' ? (
            <span className="text-green-600 font-medium">✅ Ativado</span>
          ) : permission === 'denied' ? (
            <span className="text-red-600 font-medium">❌ Bloqueado</span>
          ) : (
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Ativar
            </button>
          )}
        </div>

        {/* Som */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h3 className="font-medium">Som de Notificação</h3>
              <p className="text-sm text-gray-600">
                Tocar som ao receber nova mensagem
              </p>
            </div>
          </div>

          <input type="checkbox" className="toggle" defaultChecked />
        </div>
      </div>
    </div>
  );
}
```

---

### 7.3 Notificação Sonora no Painel

**Arquivo:** `frontend/src/app/hooks/useNotificationSound.ts`

```typescript
import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const socket = useSocket();

  useEffect(() => {
    // Criar elemento de áudio
    audioRef.current = new Audio('/notification.mp3');

    // Escutar eventos do WebSocket
    socket.on('notification', (data: any) => {
      // Tocar som
      audioRef.current?.play().catch((e) => {
        console.warn('Não foi possível tocar som:', e);
      });

      // Mostrar toast
      const { toast } = require('sonner');
      toast.info(data.title, {
        description: data.message,
        action: data.data?.ticketId ? {
          label: 'Ver',
          onClick: () => window.location.href = `/dashboard/chat?ticket=${data.data.ticketId}`,
        } : undefined,
      });
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);
}
```

**Usar no App:**

```typescript
import { useNotificationSound } from './hooks/useNotificationSound';

function App() {
  useNotificationSound(); // ✅ Ativar globalmente

  return <div>...</div>;
}
```

---

### 7.4 WhatsApp Service (Enviar para Técnicos)

**Arquivo:** `backend/src/infrastructure/services/whatsapp.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  /**
   * Enviar mensagem via bot para número de técnico
   */
  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const botUrl = process.env.BOT_URL || 'http://bot:3002';

      await axios.post(`${botUrl}/send-message`, {
        to: phoneNumber,
        message,
      }, { timeout: 5000 });

      this.logger.log(`Mensagem enviada para ${phoneNumber}`);

    } catch (error) {
      this.logger.error('Erro ao enviar WhatsApp:', error.message);
      throw error;
    }
  }
}
```

**Bot - Endpoint para enviar mensagens:**

**Arquivo:** `bot/src/api-server.js`

```javascript
// Endpoint para backend enviar mensagens
app.post('/send-message', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Campos obrigatórios: to, message' });
  }

  try {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: message });

    res.json({ success: true, message: 'Mensagem enviada' });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Checklist - Sprint 7

#### Backend
- [ ] Criar enums de eventos e canais
- [ ] Adicionar models `NotificationPreference` e `NotificationLog`
- [ ] Criar migration
- [ ] Implementar `NotificationService`
- [ ] Integrar com `TicketsService` (novo ticket)
- [ ] Integrar com `MessagesService` (nova mensagem)
- [ ] Criar `WhatsAppService` para enviar aos técnicos
- [ ] Criar `EmailService` (Nodemailer)
- [ ] Configurar VAPID keys para Web Push
- [ ] Criar endpoint `/notifications/subscribe`

#### Frontend
- [ ] Criar Service Worker (`sw.js`)
- [ ] Criar hook `useNotifications`
- [ ] Criar hook `useNotificationSound`
- [ ] Criar página de configurações
- [ ] Solicitar permissão de notificações no primeiro login
- [ ] Adicionar som de notificação (`notification.mp3`)
- [ ] Tocar som ao receber mensagem via WebSocket
- [ ] Mostrar toast com link para ticket

#### Bot
- [ ] Criar endpoint `/send-message` para backend
- [ ] Validar permissões (apenas backend pode chamar)

#### Testes
- [ ] Criar novo ticket → verificar notificação WebSocket
- [ ] Criar novo ticket → verificar WhatsApp do técnico
- [ ] Nova mensagem → verificar push desktop
- [ ] Quiet hours → verificar que não notifica
- [ ] Testar com múltiplos técnicos
- [ ] Testar prioridade URGENT (todos os canais)
- [ ] Configurar preferências e testar

---

## Plano de Testes

### Testes Manuais

#### Sprint 1
- [ ] Login como ADMIN, AGENT, VIEWER - verificar permissões
- [ ] Criar item de estoque sem permissão - verificar erro 403
- [ ] Atualizar status de reserva simultaneamente (2 navegadores)
- [ ] Buscar itens com `lowStock=true` - verificar comparação com minQuantity
- [ ] Paginação com 100+ itens - verificar performance
- [ ] Falar com técnico sem estar cadastrado - verificar coleta de nome/setor
- [ ] Reservar equipamento sem estar cadastrado
- [ ] Digitar "30/02/2026" em reserva - verificar erro
- [ ] Digitar "menu" durante fluxo de reserva - verificar cancelamento
- [ ] Redis offline - verificar fallback

#### Sprint 2
- [ ] Buscar com string de 1000 caracteres - verificar erro
- [ ] Reservar horário já ocupado - verificar mensagem de conflito
- [ ] Verificar logs de auditoria (quem criou/atualizou)
- [ ] Fazer 200 requests em 1 minuto - verificar rate limit
- [ ] Stats do dashboard - verificar cache (segunda chamada mais rápida)

#### Sprint 3
- [ ] Dividir componentes - verificar renderização
- [ ] Lazy load de modais - verificar carregamento

#### Sprint 4
- [ ] Erro de rede - verificar mensagem amigável
- [ ] Auto-refresh - verificar toast e botão pausar
- [ ] Navegação por teclado (Tab, Escape)
- [ ] Leitor de tela - verificar ARIA labels

#### Sprint 5
- [ ] Conflito de reserva - verificar sugestão de próximo horário
- [ ] API /api/docs - verificar documentação Swagger

### Testes Automatizados

```bash
# Backend
cd backend
npm run test              # Unit tests
npm run test:e2e          # Integration tests
npm run test:cov          # Coverage report

# Frontend
cd frontend
npm run test              # Component tests
npm run test:coverage     # Coverage report
```

### Métricas de Sucesso

| Métrica | Meta | Como Medir |
|---------|------|------------|
| Cobertura de testes | > 70% | `npm run test:cov` |
| Tempo de resposta /stock | < 200ms | Logs + Grafana |
| Tempo de resposta /stats | < 100ms (com cache) | Logs + Grafana |
| Bundle size frontend | < 500KB (gzipped) | `npm run build` |
| Lighthouse Score | > 90 | Chrome DevTools |
| Acessibilidade | WCAG AA | axe DevTools |

---

## Cronograma Resumido

| Sprint | Duração | Entregas Principais |
|--------|---------|---------------------|
| **Sprint 1** | 1 semana | Autorização, transações, paginação, coleta nome/setor, validação datas, tipos frontend |
| **Sprint 2** | 1 semana | Validações entrada, conflitos, auditoria, rate limiting, Redis fallback |
| **Sprint 3** | 1 semana | Cache, refatoração, índices, divisão componentes, lazy loading |
| **Sprint 4** | 1 semana | Tratamento erros, skeleton, auto-refresh, acessibilidade |
| **Sprint 5** | 1 semana | Sugestão datas, Response DTOs, Swagger, testes E2E |

**Total:** 5 semanas (~1 mês)

---

## Observações Finais

- Todas as mudanças devem ser feitas **apenas na branch `feature/v2-erp`**
- Fazer commits atômicos com mensagens descritivas
- Criar PRs para review antes de merge
- Atualizar documentação conforme implementa
- Testar em ambiente de dev antes de deploy

---

**Última Atualização:** 2026-02-01
**Responsável:** Equipe de Desenvolvimento
