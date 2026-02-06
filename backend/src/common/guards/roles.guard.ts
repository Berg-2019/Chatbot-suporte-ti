import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

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
      // Direct role match (ADMIN, AGENT)
      if (user.role === role) return true;

      // Map STOCK_MANAGER role to 'estoque' permission
      if (role === 'STOCK_MANAGER' && user.permissions?.includes('estoque')) {
        return true;
      }

      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Acesso negado. Roles necessárias: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
