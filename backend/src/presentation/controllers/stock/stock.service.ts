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

        if (query.lowStock) {
            // Itens com quantidade <= minQuantity
            where.quantity = {
                lte: where.minQuantity || 5,
            };
        }

        const items = await this.prisma.stockItem.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                reservations: {
                    where: {
                        status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
                    },
                    orderBy: { startTime: 'asc' },
                    take: 5,
                },
            },
        });

        return items;
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

        return this.prisma.stockItem.create({
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
            },
        });
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

        const [total, lowStock, assets] = await Promise.all([
            this.prisma.stockItem.count({ where }),
            this.prisma.stockItem.count({
                where: {
                    ...where,
                    quantity: { lte: 5 }, // Simplificado - idealmente comparar com minQuantity
                },
            }),
            this.prisma.stockItem.count({
                where: {
                    ...where,
                    category: 'ASSET',
                },
            }),
        ]);

        return {
            total,
            lowStock,
            assets,
            supplies: total - assets,
        };
    }
}
