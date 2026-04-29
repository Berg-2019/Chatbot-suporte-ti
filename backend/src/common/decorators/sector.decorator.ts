import { SetMetadata } from '@nestjs/common';

export const SECTOR_KEY = 'sector';
export const SECTORS_KEY = 'sectors';

export type Sector = 'TI' | 'ELECTRIC' | 'COMPRAS';

export const Sector = (...sectors: Sector[]) => SetMetadata(SECTORS_KEY, sectors);
export const RequireSector = (sector: Sector) => SetMetadata(SECTOR_KEY, sector);