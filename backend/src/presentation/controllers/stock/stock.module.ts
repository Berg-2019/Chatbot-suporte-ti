/**
 * Stock Module - Gestão de Estoque Unificado (TI + Elétrica)
 */

import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaModule } from '../../../infrastructure/database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [StockController],
    providers: [StockService],
    exports: [StockService],
})
export class StockModule { }
