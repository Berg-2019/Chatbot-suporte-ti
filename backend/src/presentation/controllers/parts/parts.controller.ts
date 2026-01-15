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
import { PartsService } from './parts.service';

@Controller('parts')
@UseGuards(AuthGuard('jwt'))
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
  async addStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.partsService.addStock(id, quantity);
  }

  @Post(':id/remove-stock')
  async removeStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.partsService.removeStock(id, quantity);
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    return this.partsService.deactivate(id);
  }
}
