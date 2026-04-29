import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  ADMIN_TI = 'ADMIN_TI',
  ADMIN_ELECTRIC = 'ADMIN_ELECTRIC',
  ADMIN_COMPRAS = 'ADMIN_COMPRAS',
  STOCK_MANAGER = 'STOCK_MANAGER',
  VIEWER = 'VIEWER',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
