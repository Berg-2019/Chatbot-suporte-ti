/**
 * Stock Controller - API Endpoints for Stock Management
 */

import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import {
    CreateStockItemDto,
    UpdateStockItemDto,
    StockQueryDto,
    StockMovementDto,
} from './stock.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('stock')
@UseGuards(AuthGuard('jwt'))
export class StockController {
    constructor(private readonly stockService: StockService) { }

    /**
     * GET /api/stock
     * Lista todos os itens de estoque com filtros
     */
    @Get()
    async findAll(@Query() query: StockQueryDto) {
        return this.stockService.findAll(query);
    }

    /**
     * GET /api/stock/stats
     * Estatísticas do estoque
     */
    @Get('stats')
    async getStats(@Query('stockType') stockType?: string) {
        return this.stockService.getStats(stockType);
    }

    /**
     * GET /api/stock/:id
     * Busca um item por ID
     */
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.stockService.findOne(id);
    }

    /**
     * POST /api/stock
     * Cria um novo item de estoque
     */
    @Post()
    async create(@Body() dto: CreateStockItemDto) {
        return this.stockService.create(dto);
    }

    /**
     * PATCH /api/stock/:id
     * Atualiza um item de estoque
     */
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
        return this.stockService.update(id, dto);
    }

    /**
     * POST /api/stock/:id/movement
     * Registra entrada/saída de estoque
     */
    @Post(':id/movement')
    async registerMovement(
        @Param('id') id: string,
        @Body() dto: StockMovementDto,
    ) {
        return this.stockService.registerMovement(id, dto);
    }

    /**
     * DELETE /api/stock/:id
     * Remove (soft delete) um item
     */
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.stockService.remove(id);
    }
}
