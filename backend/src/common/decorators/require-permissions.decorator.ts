import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator para exigir permissões granulares
 *
 * @example
 * @RequirePermissions('tickets:write')
 * async create(@Body() dto: CreateTicketDto) { }
 *
 * @example
 * @RequirePermissions('tickets:write', 'tickets:assign')
 * async assignTicket(@Param('id') id: string) { }
 *
 * @example
 * @RequirePermissions('admin:settings') // Apenas admin
 * async updateSettings() { }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator para exigir TODAS as permissões (AND)
 */
export const RequireAllPermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { permissions, requireAll: true });

/**
 * Decorator para exigir QUALQUER permissão (OR) - padrão
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { permissions, requireAll: false });
