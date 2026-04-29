import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

/**
 * RolesGuard - Guard para verificar roles (compatibilidade legada)
 *
 * ⚠️ DEPRECATED: Este guard mantém compatibilidade com o sistema antigo de roles.
 *
 * Para novos endpoints, use:
 * - PermissionsGuard + @RequirePermissions(['module:action'])
 * - PermissionsGuard + @RequireAllPermissions(['perm1', 'perm2'])
 * - PermissionsGuard + @RequireAnyPermission(['perm1', 'perm2'])
 *
 * Migração:
 * - @Roles('ADMIN') → @RequirePermissions(['*'])
 * - @Roles('STOCK_MANAGER') → @RequirePermissions(['estoque:*'])
 * - @Roles('AGENT') → @RequirePermissions(['tickets:view'])
 *
 * @deprecated Use PermissionsGuard para permissões granulares
 */
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

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const hasRole = requiredRoles.some((role) => {
      if (user.role === role) return true;

      if (role === 'ADMIN_TI' && user.role === 'ADMIN' && user.sector === 'TI') return true;
      if (role === 'ADMIN_ELECTRIC' && user.role === 'ADMIN' && user.sector === 'ELECTRIC') return true;
      if (role === 'ADMIN_COMPRAS' && user.role === 'ADMIN' && user.sector === 'COMPRAS') return true;

      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Acesso negado. Roles necessárias: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
