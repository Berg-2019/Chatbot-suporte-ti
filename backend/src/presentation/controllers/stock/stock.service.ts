/**
 * Stock Service - Business Logic for Stock Management
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
    CreateStockItemDto,
    UpdateStockItemDto,
    StockQueryDto,
    StockMovementDto,
} from './stock.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lista todos os itens de estoque com filtros
     */
    async findAll(query: StockQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.StockItemWhereInput = {
            active: true,
        };

        if (query.stockType) {
            where.stockType = query.stockType;
        }

        if (query.category) {
            where.category = query.category;
        }

        if (query.assetStatus) {
            where.assetStatus = query.assetStatus;
        }

        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.reservable) {
            where.isReservable = true;
        }

        // Buscar com paginação
        const [items, total] = await Promise.all([
            this.prisma.stockItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { reservations: true },
                    },
                },
            }),
            this.prisma.stockItem.count({ where }),
        ]);

        // Filtrar lowStock comparando quantity <= minQuantity (pós-processamento)
        let filteredItems = items;
        let filteredTotal = total;

        if (query.lowStock) {
            filteredItems = items.filter(item =>
                Number(item.quantity) <= Number(item.minQuantity)
            );
            filteredTotal = filteredItems.length;
        }

        return {
            items: filteredItems,
            total: filteredTotal,
            page,
            limit,
            pages: Math.ceil(filteredTotal / limit),
        };
    }

    /**
     * Busca um item por ID
     */
    async findOne(id: string) {
        const item = await this.prisma.stockItem.findUnique({
            where: { id },
            include: {
                reservations: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!item) {
            throw new NotFoundException(`Item de estoque ${id} não encontrado`);
        }

        return item;
    }

    /**
     * Cria um novo item de estoque
     */
    async create(dto: CreateStockItemDto) {
        // Verificar código duplicado se fornecido
        if (dto.code) {
            const existing = await this.prisma.stockItem.findUnique({
                where: { code: dto.code },
            });
            if (existing) {
                throw new BadRequestException(`Código ${dto.code} já existe`);
            }
        }

        // Verificar patrimônio duplicado se fornecido
        if (dto.assetTag) {
            const existing = await this.prisma.stockItem.findUnique({
                where: { assetTag: dto.assetTag },
            });
            if (existing) {
                throw new BadRequestException(`Patrimônio ${dto.assetTag} já existe`);
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
            console.error('Erro ao criar item de estoque:', error);
            if (error.code === 'P2002') {
                const target = error.meta?.target;
                throw new BadRequestException(`Já existe um item com este ${target}`);
            }
            throw new BadRequestException('Erro ao criar item. Verifique os dados.');
        }
    }

    /**
     * Atualiza um item de estoque
     */
    async update(id: string, dto: UpdateStockItemDto) {
        await this.findOne(id); // Verifica se existe

        return this.prisma.stockItem.update({
            where: { id },
            data: dto,
        });
    }

    /**
     * Registra movimento de estoque (entrada/saída)
     */
    async registerMovement(id: string, dto: StockMovementDto) {
        const item = await this.findOne(id);

        const newQuantity = Number(item.quantity) + dto.quantity;

        if (newQuantity < 0) {
            throw new BadRequestException(
                `Quantidade insuficiente. Disponível: ${item.quantity}`,
            );
        }

        return this.prisma.stockItem.update({
            where: { id },
            data: {
                quantity: newQuantity,
            },
        });
    }

    /**
     * Soft delete de um item
     */
    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.stockItem.update({
            where: { id },
            data: { active: false },
        });
    }

    /**
     * Estatísticas do estoque
     */
    async getStats(stockType?: string) {
        const where: Prisma.StockItemWhereInput = { active: true };
        if (stockType) {
            where.stockType = stockType as any;
        }

        try {
            // Buscar total e assets normalmente
            const [total, assets] = await Promise.all([
                this.prisma.stockItem.count({ where }),
                this.prisma.stockItem.count({
                    where: {
                        ...where,
                        category: 'ASSET',
                    },
                }),
            ]);

            // Contar lowStock buscando todos itens e filtrando
            const allItems = await this.prisma.stockItem.findMany({
                where,
                select: { quantity: true, minQuantity: true },
            });

            const lowStock = allItems.filter(
                item => Number(item.quantity) <= Number(item.minQuantity)
            ).length;

            return {
                total,
                lowStock,
                assets,
                supplies: total - assets,
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de estoque:', error);
            // Retorna valores padrão em caso de erro
            return {
                total: 0,
                lowStock: 0,
                assets: 0,
                supplies: 0,
            };
        }
    }
}
