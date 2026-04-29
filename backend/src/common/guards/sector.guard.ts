import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SECTOR_KEY, SECTORS_KEY, Sector } from '../decorators/sector.decorator';

/**
 * SectorGuard - Guard para verificar setor do usuário
 *
 * Usos:
 * - @RequireSector('TI') - Exige setor TI
 * - @Sector('TI', 'ELECTRIC') - Exige um dos setores
 */
@Injectable()
export class SectorGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredSector = this.reflector.getAllAndOverride<Sector>(SECTOR_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredSectors = this.reflector.getAllAndOverride<Sector[]>(SECTORS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredSector && !requiredSectors) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userSector = user.sector;

    if (!userSector) {
      throw new ForbiddenException('Usuário sem setor definido');
    }

    if (requiredSector) {
      if (userSector !== requiredSector) {
        throw new ForbiddenException(`Acesso negado. Setor requerido: ${requiredSector}`);
      }
    }

    if (requiredSectors) {
      if (!requiredSectors.includes(userSector as Sector)) {
        throw new ForbiddenException(`Acesso negado. Setores permitidos: ${requiredSectors.join(', ')}`);
      }
    }

    return true;
  }
}