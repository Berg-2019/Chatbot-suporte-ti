/**
 * Purchases Module - Gerenciamento de Compras
 */

import { Module } from '@nestjs/common';
import { PurchasesController, SuppliersController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { SuppliersService } from './suppliers.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PurchasesController, SuppliersController],
    providers: [PurchasesService, SuppliersService],
    exports: [PurchasesService, SuppliersService],
})
export class PurchasesModule { }
