import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import {
    CreateStockItemDto,
    UpdateStockItemDto,
    StockQueryDto,
    StockMovementDto,
    StockEntryDto,
    StockExitDto,
    MovementQueryDto,
} from './stock.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';
import { AuthUser } from '../../../domain/auth-user';

@Controller('stock')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StockController {
    constructor(private readonly stockService: StockService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async findAll(@Query() query: StockQueryDto, @Request() req: any) {
        const user = req.user as AuthUser;
        const queryWithSector = { ...query };
        if (!user.role.startsWith('ADMIN')) {
            (queryWithSector as any).stockType = user.sector === 'ELECTRIC' ? 'ELECTRIC' : 'TI';
        }
        return this.stockService.findAll(queryWithSector);
    }

    @Get('stats')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async getStats(@Query('stockType') stockType?: string) {
        return this.stockService.getStats(stockType);
    }

    @Get('movements')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async getMovements(@Query() query: MovementQueryDto) {
        return this.stockService.getMovements(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.AGENT, UserRole.STOCK_MANAGER, UserRole.VIEWER)
    async findOne(@Param('id') id: string) {
        return this.stockService.findOne(id);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.STOCK_MANAGER)
    async create(@Body() dto: CreateStockItemDto) {
        return this.stockService.create(dto);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.STOCK_MANAGER)
    async update(@Param('id') id: string, @Body() dto: UpdateStockItemDto) {
        return this.stockService.update(id, dto);
    }

    @Post(':id/movement')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.STOCK_MANAGER, UserRole.AGENT)
    async registerMovement(
        @Param('id') id: string,
        @Body() dto: StockMovementDto,
        @Request() req: any,
    ) {
        const user = req.user as AuthUser;
        return this.stockService.registerMovement(id, dto, user.name);
    }

    @Post(':id/entry')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.STOCK_MANAGER)
    async registerEntry(
        @Param('id') id: string,
        @Body() dto: StockEntryDto,
        @Request() req: any,
    ) {
        const user = req.user as AuthUser;
        return this.stockService.registerEntry(id, dto, user.name);
    }

    @Post(':id/exit')
    @Roles(UserRole.ADMIN, UserRole.ADMIN_TI, UserRole.ADMIN_ELECTRIC, UserRole.STOCK_MANAGER, UserRole.AGENT)
    async registerExit(
        @Param('id') id: string,
        @Body() dto: StockExitDto,
        @Request() req: any,
    ) {
        const user = req.user as AuthUser;
        return this.stockService.registerExit(id, dto, user.name);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.STOCK_MANAGER)
    async remove(@Param('id') id: string) {
        return this.stockService.remove(id);
    }
}
