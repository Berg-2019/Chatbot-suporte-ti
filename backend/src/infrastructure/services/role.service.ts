import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todas as roles
   */
  async findAll(filters?: { isSystem?: boolean }) {
    const where: Prisma.CustomRoleWhereInput = {};

    if (filters?.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    return this.prisma.customRole.findMany({
      where,
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Buscar role por ID
   */
  async findOne(id: string) {
    const role = await this.prisma.customRole.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role;
  }

  /**
   * Buscar role por nome
   */
  async findByName(name: string) {
    return this.prisma.customRole.findUnique({
      where: { name },
    });
  }

  /**
   * Criar nova role
   */
  async create(data: {
    name: string;
    description?: string;
    permissions: string[];
    isSystem?: boolean;
  }) {
    this.logger.log(`Creating role: ${data.name}`);

    // Verificar se já existe
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new ConflictException(`Role with name "${data.name}" already exists`);
    }

    // Validar permissões
    this.validatePermissions(data.permissions);

    const role = await this.prisma.customRole.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: data.isSystem || false,
      },
    });

    this.logger.log(`Role created: ${role.id}`);
    return role;
  }

  /**
   * Atualizar role
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
    },
  ) {
    this.logger.log(`Updating role: ${id}`);

    // Verificar se existe
    const role = await this.findOne(id);

    // Não permitir editar roles do sistema
    if (role.isSystem) {
      throw new ConflictException('System roles cannot be modified');
    }

    // Validar permissões se fornecidas
    if (data.permissions) {
      this.validatePermissions(data.permissions);
    }

    // Verificar nome duplicado
    if (data.name && data.name !== role.name) {
      const existing = await this.findByName(data.name);
      if (existing) {
        throw new ConflictException(`Role with name "${data.name}" already exists`);
      }
    }

    const updateData: Prisma.CustomRoleUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.permissions) updateData.permissions = data.permissions;

    const updated = await this.prisma.customRole.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Role updated: ${id}`);
    return updated;
  }

  /**
   * Deletar role
   */
  async delete(id: string) {
    this.logger.log(`Deleting role: ${id}`);

    const role = await this.findOne(id);

    // Não permitir deletar roles do sistema
    if (role.isSystem) {
      throw new ConflictException('System roles cannot be deleted');
    }

    // Verificar se há usuários usando esta role
    const usersCount = await this.prisma.user.count({
      where: { roleId: id },
    });

    if (usersCount > 0) {
      throw new ConflictException(
        `Cannot delete role. ${usersCount} user(s) are currently assigned to this role`,
      );
    }

    await this.prisma.customRole.delete({
      where: { id },
    });

    this.logger.log(`Role deleted: ${id}`);
    return { success: true, message: 'Role deleted successfully' };
  }

  /**
   * Verificar se usuário tem permissão
   */
  async userHasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customRole: true },
    });

    if (!user) {
      return false;
    }

    // Admin legado sempre tem permissão
    if (user.role === 'ADMIN') {
      return true;
    }

    // Se não tem role customizada, usar permissões legadas
    if (!user.customRole) {
      return this.checkLegacyPermissions(user.role, permission);
    }

    const permissions = user.customRole.permissions as string[];

    // Wildcard: * = todas as permissões
    if (permissions.includes('*')) {
      return true;
    }

    // Permissão exata
    if (permissions.includes(permission)) {
      return true;
    }

    // Wildcard de módulo: tickets:* = todas permissões de tickets
    const [module] = permission.split(':');
    if (permissions.includes(`${module}:*`)) {
      return true;
    }

    return false;
  }

  /**
   * Verificar múltiplas permissões (qualquer uma)
   */
  async userHasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      const has = await this.userHasPermission(userId, permission);
      if (has) return true;
    }
    return false;
  }

  /**
   * Verificar múltiplas permissões (todas)
   */
  async userHasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      const has = await this.userHasPermission(userId, permission);
      if (!has) return false;
    }
    return true;
  }

  /**
   * Obter todas as permissões de um usuário
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customRole: true },
    });

    if (!user) {
      return [];
    }

    // Admin legado tem todas as permissões
    if (user.role === 'ADMIN') {
      return ['*'];
    }

    if (!user.customRole) {
      return this.getLegacyPermissions(user.role);
    }

    return user.customRole.permissions as string[];
  }

  /**
   * Atribuir role a usuário
   */
  async assignRoleToUser(userId: string, roleId: string) {
    // Verificar se role existe
    await this.findOne(roleId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });

    this.logger.log(`Role ${roleId} assigned to user ${userId}`);
    return { success: true, message: 'Role assigned successfully' };
  }

  /**
   * Remover role de usuário
   */
  async removeRoleFromUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: null },
    });

    this.logger.log(`Role removed from user ${userId}`);
    return { success: true, message: 'Role removed successfully' };
  }

  /**
   * Validar permissões
   */
  private validatePermissions(permissions: string[]) {
    const allowedModules = [
      'tickets',
      'stock',
      'reservations',
      'users',
      'reports',
      'admin',
      'bot',
      'contacts',
      'webhooks',
      'automation',
    ];

    const allowedActions = ['read', 'write', 'delete', 'assign', 'close', 'approve', 'export'];

    for (const permission of permissions) {
      // Wildcard global
      if (permission === '*') continue;

      const [module, action] = permission.split(':');

      // Validar módulo
      if (!allowedModules.includes(module)) {
        throw new Error(`Invalid permission module: ${module}`);
      }

      // Wildcard de módulo
      if (action === '*') continue;

      // Validar ação
      if (!allowedActions.includes(action)) {
        throw new Error(`Invalid permission action: ${action}`);
      }
    }
  }

  /**
   * Verificar permissões legadas (compatibilidade)
   */
  private checkLegacyPermissions(role: string, permission: string): boolean {
    const legacyPermissions = this.getLegacyPermissions(role);
    return legacyPermissions.includes(permission) || legacyPermissions.includes('*');
  }

  /**
   * Obter permissões legadas
   */
  private getLegacyPermissions(role: string): string[] {
    switch (role) {
      case 'ADMIN':
        return ['*'];
      case 'AGENT':
        return [
          'tickets:read',
          'tickets:write',
          'tickets:assign',
          'stock:read',
          'reports:read',
          'contacts:read',
          'contacts:write',
        ];
      default:
        return [];
    }
  }

  /**
   * Listar todas as permissões disponíveis
   */
  async getAvailablePermissions() {
    return {
      tickets: [
        'tickets:read',
        'tickets:write',
        'tickets:assign',
        'tickets:delete',
        'tickets:close',
        'tickets:*',
      ],
      stock: ['stock:read', 'stock:write', 'stock:delete', 'stock:*'],
      reservations: [
        'reservations:read',
        'reservations:write',
        'reservations:approve',
        'reservations:*',
      ],
      users: ['users:read', 'users:write', 'users:delete', 'users:*'],
      reports: ['reports:read', 'reports:export', 'reports:*'],
      admin: [
        'admin:settings',
        'admin:automation',
        'admin:webhooks',
        'admin:roles',
        'admin:*',
      ],
      bot: ['bot:config', 'bot:messages', 'bot:*'],
      contacts: ['contacts:read', 'contacts:write', 'contacts:delete', 'contacts:*'],
      webhooks: ['webhooks:read', 'webhooks:write', 'webhooks:delete', 'webhooks:*'],
      automation: ['automation:read', 'automation:write', 'automation:delete', 'automation:*'],
      wildcard: ['*'],
    };
  }
}
