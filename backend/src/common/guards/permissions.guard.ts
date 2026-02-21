import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RoleService } from '../../infrastructure/services/role.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionsMetadata = this.reflector.getAllAndOverride<
      string[] | { permissions: string[]; requireAll: boolean }
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // Se não há metadados de permissão, permitir acesso
    if (!permissionsMetadata) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Extrair permissões e configuração
    let requiredPermissions: string[];
    let requireAll = false;

    if (typeof permissionsMetadata === 'object' && !Array.isArray(permissionsMetadata)) {
      requiredPermissions = (permissionsMetadata as { permissions: string[]; requireAll: boolean })
        .permissions;
      requireAll =
        (permissionsMetadata as { permissions: string[]; requireAll: boolean }).requireAll || false;
    } else {
      requiredPermissions = Array.isArray(permissionsMetadata)
        ? permissionsMetadata
        : [permissionsMetadata];
    }

    // Verificar permissões
    let hasPermission: boolean;

    if (requireAll) {
      // Exige TODAS as permissões (AND)
      hasPermission = await this.roleService.userHasAllPermissions(
        user.id,
        requiredPermissions,
      );
    } else {
      // Exige QUALQUER permissão (OR)
      hasPermission = await this.roleService.userHasAnyPermission(user.id, requiredPermissions);
    }

    if (!hasPermission) {
      const operator = requireAll ? 'todas as' : 'pelo menos uma das';
      throw new ForbiddenException(
        `Acesso negado. É necessário ter ${operator} permissões: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
