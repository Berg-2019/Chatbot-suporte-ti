/**
 * Parts Controller - API de Controle de Estoque
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PartsService } from './parts.service';

@Controller('parts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PartsController {
  constructor(private partsService: PartsService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.partsService.findAll(includeInactive === 'true');
  }

  @Get('low-stock')
  async getLowStock() {
    return this.partsService.getLowStockAlerts();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.partsService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'ADMIN_TI', 'STOCK_MANAGER')
  async create(
    @Body()
    dto: {
      name: string;
      code: string;
      description?: string;
      quantity?: number;
      minQuantity?: number;
      unitCost: number;
    },
  ) {
    return this.partsService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'STOCK_MANAGER')
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      description?: string;
      quantity?: number;
      minQuantity?: number;
      unitCost?: number;
      active?: boolean;
    },
  ) {
    return this.partsService.update(id, dto);
  }

  @Post(':id/add-stock')
  @Roles('ADMIN', 'ADMIN_TI', 'STOCK_MANAGER')
  async addStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.partsService.addStock(id, quantity);
  }

  @Post(':id/remove-stock')
  @Roles('ADMIN', 'ADMIN_TI', 'STOCK_MANAGER')
  async removeStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.partsService.removeStock(id, quantity);
  }

  @Delete(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'STOCK_MANAGER')
  async deactivate(@Param('id') id: string) {
    return this.partsService.deactivate(id);
  }
}
