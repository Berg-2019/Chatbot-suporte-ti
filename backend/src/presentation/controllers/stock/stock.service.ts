import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
    CreateStockItemDto,
    UpdateStockItemDto,
    StockQueryDto,
    StockMovementDto,
    StockEntryDto,
    StockExitDto,
    MovementQueryDto,
} from './stock.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockService {
    private readonly logger = new Logger(StockService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll(query: StockQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.StockItemWhereInput = { active: true };

        if (query.stockType) where.stockType = query.stockType;
        if (query.category) where.category = query.category;
        if (query.assetStatus) where.assetStatus = query.assetStatus;
        if (query.reservable) where.isReservable = true;

        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.lowStock) {
            where.category = { not: 'ASSET' };
            where.quantity = { lte: this.prisma.stockItem.fields.minQuantity as any };
        }

        const [items, total] = await Promise.all([
            this.prisma.stockItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    _count: { select: { reservations: true, movements: true } },
                },
            }),
            this.prisma.stockItem.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string) {
        const item = await this.prisma.stockItem.findUnique({
            where: { id },
            include: {
                reservations: { orderBy: { createdAt: 'desc' }, take: 10 },
                movements: { orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });

        if (!item) {
            throw new NotFoundException(`Item de estoque ${id} nao encontrado`);
        }

        return item;
    }

    async create(dto: CreateStockItemDto) {
        if (dto.code) {
            const existing = await this.prisma.stockItem.findUnique({
                where: { code: dto.code },
            });
            if (existing) {
                throw new BadRequestException(`Codigo ${dto.code} ja existe`);
            }
        }

        try {
            return await this.prisma.stockItem.create({
                data: {
                    name: dto.name,
                    code: dto.code,
                    description: dto.description,
                    stockType: dto.stockType,
                    category: dto.category,
                    quantity: dto.quantity || 0,
                    minQuantity: dto.minQuantity || 5,
                    unit: dto.unit,
                    unitCost: dto.unitCost,
                    location: dto.location,
                    printerModel: dto.printerModel,
                    inkColor: dto.inkColor,
                    assetTag: dto.assetTag,
                    assetStatus: dto.assetStatus || 'AVAILABLE',
                    isReservable: dto.isReservable || false,
                },
            });
        } catch (error) {
            this.logger.error('Erro ao criar item de estoque', error);
            if (error.code === 'P2002') {
                const target = error.meta?.target;
                throw new BadRequestException(`Ja existe um item com este ${target}`);
            }
            throw new BadRequestException('Erro ao criar item. Verifique os dados.');
        }
    }

    async update(id: string, dto: UpdateStockItemDto) {
        await this.findOne(id);

        const data: any = { ...dto };
        delete data.quantity;

        return this.prisma.stockItem.update({
            where: { id },
            data,
        });
    }

    async registerMovement(id: string, dto: StockMovementDto, performedBy?: string) {
        const item = await this.findOne(id);

        const newQuantity = Number(item.quantity) + dto.quantity;

        if (newQuantity < 0) {
            throw new BadRequestException(
                `Quantidade insuficiente. Disponivel: ${item.quantity}`,
            );
        }

        if (dto.ticketId) {
            const ticket = await this.prisma.ticket.findUnique({ where: { id: dto.ticketId } });
            if (!ticket) {
                throw new BadRequestException(`Ticket ${dto.ticketId} nao encontrado`);
            }
        }

        const [updatedItem] = await this.prisma.$transaction([
            this.prisma.stockItem.update({
                where: { id },
                data: { quantity: newQuantity },
            }),
            this.prisma.stockMovement.create({
                data: {
                    stockItemId: id,
                    type: dto.quantity > 0 ? 'IN' : 'OUT',
                    quantity: Math.abs(dto.quantity),
                    reason: dto.reason || (dto.quantity > 0 ? 'Entrada de estoque' : 'Saida de estoque'),
                    performedBy: performedBy || (dto.ticketId ? `Ticket #${dto.ticketId}` : undefined),
                },
            }),
        ]);

        return updatedItem;
    }

    async registerEntry(id: string, dto: StockEntryDto, performedBy: string) {
        const item = await this.findOne(id);

        const newQuantity = Number(item.quantity) + dto.quantity;

        const [updatedItem] = await this.prisma.$transaction([
            this.prisma.stockItem.update({
                where: { id },
                data: { quantity: newQuantity },
            }),
            this.prisma.stockMovement.create({
                data: {
                    stockItemId: id,
                    type: 'IN',
                    quantity: dto.quantity,
                    reason: dto.reason || 'Entrada de estoque',
                    performedBy,
                },
            }),
        ]);

        return updatedItem;
    }

    async registerExit(id: string, dto: StockExitDto, performedBy: string) {
        const item = await this.findOne(id);

        if (Number(item.quantity) < dto.quantity) {
            throw new BadRequestException(
                `Quantidade insuficiente. Disponivel: ${item.quantity}, solicitado: ${dto.quantity}`,
            );
        }

        if (dto.ticketId) {
            const ticket = await this.prisma.ticket.findUnique({ where: { id: dto.ticketId } });
            if (!ticket) {
                throw new BadRequestException(`Ticket ${dto.ticketId} nao encontrado`);
            }
        }

        const newQuantity = Number(item.quantity) - dto.quantity;

        let reason = dto.reason || 'Saida de estoque';
        if (dto.ticketId) reason += ` (Ticket #${dto.ticketId})`;
        if (dto.destination) reason += ` — Destino: ${dto.destination}`;

        const [updatedItem] = await this.prisma.$transaction([
            this.prisma.stockItem.update({
                where: { id },
                data: { quantity: newQuantity },
            }),
            this.prisma.stockMovement.create({
                data: {
                    stockItemId: id,
                    type: 'OUT',
                    quantity: dto.quantity,
                    reason,
                    performedBy: dto.technicianId
                        ? `${performedBy} (tecnico: ${dto.technicianId})`
                        : performedBy,
                },
            }),
        ]);

        return updatedItem;
    }

    async getMovements(query: MovementQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.StockMovementWhereInput = {};

        if (query.type) where.type = query.type;
        if (query.stockItemId) where.stockItemId = query.stockItemId;
        if (query.performedBy) where.performedBy = { contains: query.performedBy, mode: 'insensitive' };

        const [items, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    stockItem: { select: { id: true, name: true, code: true, unit: true } },
                },
            }),
            this.prisma.stockMovement.count({ where }),
        ]);

        return { items, total, page, limit, pages: Math.ceil(total / limit) };
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.stockItem.update({
            where: { id },
            data: { active: false },
        });
    }

    async getStats(stockType?: string) {
        const where: Prisma.StockItemWhereInput = { active: true };
        if (stockType) where.stockType = stockType as any;

        try {
            const [total, assets, lowStock] = await Promise.all([
                this.prisma.stockItem.count({ where }),
                this.prisma.stockItem.count({
                    where: { ...where, category: 'ASSET' },
                }),
                this.prisma.$queryRaw`
                    SELECT COUNT(*) as count FROM stock_items
                    WHERE active = true
                    AND category != 'ASSET'
                    ${stockType ? Prisma.sql`AND stock_type = ${stockType}` : Prisma.empty}
                    AND quantity <= min_quantity
                `.then((r: any) => Number(r[0]?.count || 0)),
            ]);

            return { total, lowStock, assets, supplies: total - assets };
        } catch (error) {
            this.logger.error('Erro ao buscar estatisticas de estoque', error);
            return { total: 0, lowStock: 0, assets: 0, supplies: 0 };
        }
    }
}
