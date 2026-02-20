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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleService } from '../../../infrastructure/services/role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
} from '../../../domain/dtos/role';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * GET /roles
   * Listar todas as roles
   */
  @Get()
  @Roles('ADMIN')
  async findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findAll(query);
  }

  /**
   * GET /roles/permissions
   * Listar todas as permissões disponíveis
   */
  @Get('permissions')
  @Roles('ADMIN')
  async getAvailablePermissions() {
    return this.roleService.getAvailablePermissions();
  }

  /**
   * GET /roles/:id
   * Buscar role por ID
   */
  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  /**
   * POST /roles
   * Criar nova role
   */
  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  /**
   * POST /roles/:roleId/assign/:userId
   * Atribuir role a usuário
   */
  @Post(':roleId/assign/:userId')
  @Roles('ADMIN')
  async assignToUser(@Param('roleId') roleId: string, @Param('userId') userId: string) {
    return this.roleService.assignRoleToUser(userId, roleId);
  }

  /**
   * PATCH /roles/:id
   * Atualizar role
   */
  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  /**
   * DELETE /roles/:id
   * Deletar role
   */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.roleService.delete(id);
  }
}
