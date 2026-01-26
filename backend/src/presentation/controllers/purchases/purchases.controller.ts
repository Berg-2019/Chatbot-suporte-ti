/**
 * Purchases Controller - API de Compras de Equipamentos
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PurchasesService } from './purchases.service';
import { SuppliersService } from './suppliers.service';

// Tipo local para categoria (até migration rodar)
type EquipmentCategory = 'COMPUTER' | 'PRINTER' | 'MONITOR' | 'PERIPHERAL' | 'NETWORK' | 'SOFTWARE' | 'OTHER';

@Controller('purchases')
@UseGuards(AuthGuard('jwt'))
export class PurchasesController {
  constructor(
    private purchasesService: PurchasesService,
    private suppliersService: SuppliersService,
  ) {}

  // =========== COMPRAS ===========

  @Get()
  async list(
    @Query('sector') sector?: string,
    @Query('category') category?: EquipmentCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.purchasesService.findAll({
      sector,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      supplierId,
    });
  }

  @Get('stats')
  async getStats() {
    return this.purchasesService.getDashboardStats();
  }

  @Get('sectors')
  async getSectors() {
    return this.purchasesService.getSectors();
  }

  @Get('reports/monthly')
  async getMonthlyReport(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.purchasesService.getMonthlyReport(
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
    );
  }

  @Get('reports/sector')
  async getSectorReport(
    @Query('sector') sector: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.purchasesService.getSectorReport(
      sector,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.purchasesService.findById(id);
  }

  @Post()
  async create(
    @Body() body: {
      name: string;
      category?: EquipmentCategory;
      serialNumber?: string;
      assetTag?: string;
      quantity?: number;
      unitPrice: number;
      supplierId?: string;
      supplierName?: string;
      sector: string;
      location?: string;
      responsibleName?: string;
      invoiceNumber?: string;
      invoiceDate?: string;
      warrantyMonths?: number;
      purchaseDate?: string;
      notes?: string;
    },
    @Request() req: any,
  ) {
    return this.purchasesService.create({
      ...body,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      createdById: req.user?.id,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.purchasesService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.purchasesService.delete(id);
  }
}

// =========== SUPPLIERS CONTROLLER ===========

@Controller('suppliers')
@UseGuards(AuthGuard('jwt'))
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  async list(@Query('includeInactive') includeInactive?: string) {
    return this.suppliersService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Post()
  async create(
    @Body() body: {
      name: string;
      cnpj?: string;
      phone?: string;
      email?: string;
      address?: string;
    },
  ) {
    return this.suppliersService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.suppliersService.update(id, body);
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    return this.suppliersService.deactivate(id);
  }
}
