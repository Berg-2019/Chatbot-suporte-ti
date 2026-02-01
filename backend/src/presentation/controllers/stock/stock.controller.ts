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
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';

@Controller('stock')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StockController {
    constructor(private readonly stockService: StockService) { }

    /**
     * GET /api/stock
     * Lista todos os itens de estoque com filtros
     */
    @Get()
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async findAll(@Query() query: StockQueryDto) {
        return this.stockService.findAll(query);
    }

    /**
     * GET /api/stock/stats
     * Estatísticas do estoque
     */
    @Get('stats')
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async getStats(@Query('stockType') stockType?: string) {
        return this.stockService.getStats(stockType);
    }

    /**
     * GET /api/stock/:id
     * Busca um item por ID
     */
    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async findOne(@Param('id') id: string) {
        return this.stockService.findOne(id);
    }

    /**
     * POST /api/stock
     * Cria um novo item de estoque
     */
    @Post()
    @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
    async create(@Body() dto: CreateStockItemDto) {
        return this.stockService.create(dto);
    }

    /**
     * PATCH /api/stock/:id
     * Atualiza um item de estoque
     */
    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
    async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
        return this.stockService.update(id, dto);
    }

    /**
     * POST /api/stock/:id/movement
     * Registra entrada/saída de estoque
     */
    @Post(':id/movement')
    @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER, UserRole.AGENT)
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
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string) {
        return this.stockService.remove(id);
    }
}
