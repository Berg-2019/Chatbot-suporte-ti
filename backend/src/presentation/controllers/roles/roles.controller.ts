import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions, RequireAllPermissions } from '../../../common/decorators/require-permissions.decorator';
import { RoleService } from '../../../infrastructure/services/role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
} from '../../../domain/dtos/role';

@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RolesController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * GET /roles
   * Listar todas as roles
   */
  @Get()
  @RequirePermissions('roles:view')
  async findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findAll(query);
  }

  /**
   * GET /roles/permissions
   * Listar todas as permissões disponíveis
   */
  @Get('permissions')
  @RequirePermissions('roles:view')
  async getAvailablePermissions() {
    return this.roleService.getAvailablePermissions();
  }

  /**
   * GET /roles/:id
   * Buscar role por ID
   */
  @Get(':id')
  @RequirePermissions('roles:view')
  async findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  /**
   * POST /roles
   * Criar nova role
   */
  @Post()
  @RequirePermissions('roles:create')
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  /**
   * POST /roles/:roleId/assign/:userId
   * Atribuir role a usuário (operação sensível)
   */
  @Post(':roleId/assign/:userId')
  @RequireAllPermissions('roles:assign', 'users:update')
  async assignToUser(@Param('roleId') roleId: string, @Param('userId') userId: string) {
    return this.roleService.assignRoleToUser(userId, roleId);
  }

  /**
   * PATCH /roles/:id
   * Atualizar role
   */
  @Patch(':id')
  @RequirePermissions('roles:update')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  /**
   * DELETE /roles/:id
   * Deletar role (operação sensível)
   */
  @Delete(':id')
  @RequireAllPermissions('roles:delete', 'audit:view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.roleService.delete(id);
  }
}
