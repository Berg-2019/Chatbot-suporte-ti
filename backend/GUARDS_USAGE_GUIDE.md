# 🛡️ Guia de Uso dos Guards de Autorização

## Visão Geral

O sistema de autorização possui dois guards:

1. **RolesGuard** (Legado) - Baseado em roles fixos
2. **PermissionsGuard** (Novo) - Baseado em permissões granulares

## PermissionsGuard - Sistema Recomendado ✅

### Decorators Disponíveis

#### 1. @RequirePermissions (OR Logic)

Usuário precisa ter **pelo menos uma** das permissões listadas.

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {

  // Permite usuários com 'tickets:view' OU 'tickets:*' OU '*'
  @Get()
  @RequirePermissions('tickets:view')
  async findAll() {
    // ...
  }

  // Permite usuários com 'tickets:create' OU 'tickets:*' OU '*'
  @Post()
  @RequirePermissions('tickets:create')
  async create(@Body() dto: CreateTicketDto) {
    // ...
  }
}
```

#### 2. @RequireAllPermissions (AND Logic)

Usuário precisa ter **todas** as permissões listadas.

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {

  // Usuário DEVE ter todas: 'users:delete' E 'audit:view'
  @Delete('users/:id')
  @RequireAllPermissions('users:delete', 'audit:view')
  async deleteUser(@Param('id') id: string) {
    // Apenas admins com ambas permissões
  }

  // Usuário DEVE ter todas: 'roles:update' E 'roles:create'
  @Put('roles/:id')
  @RequireAllPermissions('roles:update', 'roles:create')
  async updateRole(@Param('id') id: string) {
    // ...
  }
}
```

#### 3. @RequireAnyPermission (Alias para OR)

Mesma função do `@RequirePermissions`, apenas mais explícito.

```typescript
@Get('dashboard')
@RequireAnyPermission('dashboard:view', 'reports:view')
async getDashboard() {
  // Usuário precisa de UMA das duas permissões
}
```

## Sistema de Permissões

### Formato das Permissões

```
módulo:ação
```

Exemplos:
- `tickets:view` - Ver tickets
- `tickets:create` - Criar tickets
- `users:delete` - Deletar usuários
- `estoque:*` - Todas as ações de estoque
- `*` - Todas as permissões (super admin)

### Módulos Disponíveis

| Módulo | Descrição | Ações Comuns |
|--------|-----------|--------------|
| `tickets` | Gerenciamento de tickets | view, create, update, delete, assign |
| `users` | Gerenciamento de usuários | view, create, update, delete |
| `contacts` | Gerenciamento de contatos | view, create, update, delete, merge |
| `estoque` | Gerenciamento de estoque | view, create, update, delete, transfer |
| `roles` | Gerenciamento de roles/permissões | view, create, update, delete |
| `webhooks` | Gerenciamento de webhooks | view, create, update, delete, test |
| `canned_responses` | Respostas prontas | view, create, update, delete |
| `reports` | Relatórios e analytics | view, export |
| `settings` | Configurações do sistema | view, update |
| `audit` | Logs de auditoria | view |

### Wildcards

- `tickets:*` - Todas as ações de tickets
- `*` - Todas as permissões do sistema (super admin)

## Exemplos Práticos

### Exemplo 1: CRUD Simples

```typescript
@Controller('canned-responses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CannedResponsesController {

  @Get()
  @RequirePermissions('canned_responses:view')
  async findAll() { /* ... */ }

  @Get(':id')
  @RequirePermissions('canned_responses:view')
  async findOne(@Param('id') id: string) { /* ... */ }

  @Post()
  @RequirePermissions('canned_responses:create')
  async create(@Body() dto: CreateCannedResponseDto) { /* ... */ }

  @Patch(':id')
  @RequirePermissions('canned_responses:update')
  async update(@Param('id') id: string, @Body() dto: UpdateCannedResponseDto) { /* ... */ }

  @Delete(':id')
  @RequirePermissions('canned_responses:delete')
  async remove(@Param('id') id: string) { /* ... */ }
}
```

### Exemplo 2: Operações Sensíveis (AND Logic)

```typescript
@Controller('webhooks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WebhooksController {

  // Operação normal - apenas uma permissão
  @Get()
  @RequirePermissions('webhooks:view')
  async findAll() { /* ... */ }

  // Operação sensível - precisa de múltiplas permissões
  @Delete(':id')
  @RequireAllPermissions('webhooks:delete', 'audit:view')
  async remove(@Param('id') id: string) {
    // Usuário precisa de AMBAS as permissões
  }

  // Teste de webhook - requer permissões especiais
  @Post(':id/test')
  @RequireAllPermissions('webhooks:test', 'webhooks:view')
  async testWebhook(@Param('id') id: string) { /* ... */ }
}
```

### Exemplo 3: Múltiplas Opções (OR Logic)

```typescript
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {

  // Supervisores OU gerentes podem ver relatórios
  @Get('sales')
  @RequireAnyPermission('reports:view', 'dashboard:view')
  async getSalesReport() { /* ... */ }

  // Várias roles podem exportar
  @Get('export')
  @RequireAnyPermission('reports:export', 'reports:view', 'dashboard:export')
  async exportReport() { /* ... */ }
}
```

### Exemplo 4: Endpoints Públicos vs Protegidos

```typescript
@Controller('knowledge-base')
export class KnowledgeBaseController {

  // Endpoint público - sem guards
  @Get('public/:slug')
  async getPublicArticle(@Param('slug') slug: string) {
    // Qualquer usuário pode acessar
  }

  // Endpoint protegido
  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('knowledge_base:view')
  async getAllArticles() {
    // Apenas usuários autenticados com permissão
  }

  // Criação - apenas admins
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireAllPermissions('knowledge_base:create', 'knowledge_base:publish')
  async create(@Body() dto: CreateArticleDto) {
    // Precisa de ambas as permissões
  }
}
```

## RolesGuard - Sistema Legado ⚠️

**Não use em novos endpoints!** Mantido apenas para compatibilidade.

```typescript
import { UseGuards } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@Controller('legacy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LegacyController {

  @Get()
  @Roles('ADMIN', 'AGENT')
  async oldEndpoint() {
    // ❌ Não use mais este padrão
  }
}
```

### Migração de RolesGuard para PermissionsGuard

| Antes (RolesGuard) | Depois (PermissionsGuard) |
|-------------------|---------------------------|
| `@Roles('ADMIN')` | `@RequirePermissions('*')` |
| `@Roles('STOCK_MANAGER')` | `@RequirePermissions('estoque:*')` |
| `@Roles('AGENT')` | `@RequirePermissions('tickets:view')` |
| `@Roles('ADMIN', 'SUPERVISOR')` | `@RequireAnyPermission('*', 'users:view')` |

## Testando Permissões

### 1. Criar Role Customizada

```bash
POST /roles
{
  "name": "Agente N1",
  "description": "Agente de suporte nível 1",
  "permissions": [
    "tickets:view",
    "tickets:create",
    "tickets:update",
    "contacts:view",
    "canned_responses:view"
  ]
}
```

### 2. Atribuir Role ao Usuário

```bash
PATCH /users/:userId
{
  "roleId": "uuid-da-role"
}
```

### 3. Testar Endpoint

```bash
# Token do usuário com a role
GET /tickets
Authorization: Bearer <token>

# ✅ Sucesso - usuário tem 'tickets:view'

POST /webhooks
Authorization: Bearer <token>

# ❌ 403 Forbidden - usuário não tem 'webhooks:create'
```

## Verificação Programática

Se precisar verificar permissões dentro do código:

```typescript
import { RoleService } from '@/infrastructure/services/role.service';

@Injectable()
export class TicketsService {
  constructor(private roleService: RoleService) {}

  async assignTicket(ticketId: string, userId: string, assigneeId: string) {
    // Verifica se usuário pode atribuir tickets
    const canAssign = await this.roleService.userHasPermission(
      userId,
      'tickets:assign'
    );

    if (!canAssign) {
      throw new ForbiddenException('Você não pode atribuir tickets');
    }

    // Lógica de atribuição...
  }

  async deleteTicket(ticketId: string, userId: string) {
    // Verifica múltiplas permissões
    const hasAllPermissions = await this.roleService.userHasAllPermissions(
      userId,
      ['tickets:delete', 'audit:create']
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Permissões insuficientes');
    }

    // Lógica de deleção + criar log de auditoria...
  }
}
```

## Boas Práticas

### ✅ DO

- Use `@RequirePermissions` para operações simples
- Use `@RequireAllPermissions` para operações sensíveis
- Crie permissões granulares (`tickets:view`, `tickets:create`)
- Use wildcards para admins (`*`) e módulos (`tickets:*`)
- Documente quais permissões cada endpoint requer

### ❌ DON'T

- Não use `RolesGuard` em novos endpoints
- Não crie permissões muito genéricas (`can_do_anything`)
- Não esqueça de adicionar `PermissionsGuard` no `@UseGuards`
- Não hardcode verificações de role no código (`if (user.role === 'ADMIN')`)

## Hierarquia de Permissões

```
* (super admin)
└── módulo:* (todas ações do módulo)
    └── módulo:ação (ação específica)
```

Exemplo:
```typescript
// Usuário com '*' pode acessar tudo
// Usuário com 'tickets:*' pode acessar todos endpoints de tickets
// Usuário com 'tickets:view' pode apenas visualizar tickets
```

## Troubleshooting

### Erro: "Acesso negado. Permissões necessárias: tickets:create"

**Solução**: Adicione a permissão `tickets:create` à role do usuário.

### Erro: "RoleService não injetado"

**Solução**: Certifique-se de que `RolesModule` está importado no módulo.

```typescript
@Module({
  imports: [RolesModule],
  // ...
})
export class TicketsModule {}
```

### Guards não estão funcionando

**Solução**: Verifique a ordem dos guards:

```typescript
// ✅ Correto
@UseGuards(JwtAuthGuard, PermissionsGuard)

// ❌ Errado - PermissionsGuard precisa do user do JWT
@UseGuards(PermissionsGuard, JwtAuthGuard)
```

## Resumo

- **Novos endpoints**: Use `PermissionsGuard` + `@RequirePermissions`
- **Operações sensíveis**: Use `@RequireAllPermissions`
- **Múltiplas opções**: Use `@RequireAnyPermission`
- **Endpoints legados**: Mantenha `RolesGuard` mas planeje migração
- **Admins**: Use permissão `*`
- **Wildcards de módulo**: Use `módulo:*`

---

**Documentação relacionada:**
- [RBAC Architecture](./backend/src/infrastructure/services/role.service.ts)
- [Permissions Decorator](./backend/src/common/decorators/require-permissions.decorator.ts)
- [Guards Implementation](./backend/src/common/guards/)
