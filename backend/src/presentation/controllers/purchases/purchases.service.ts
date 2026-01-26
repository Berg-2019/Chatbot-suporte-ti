/**
 * Purchases Service - Gerenciamento de Compras de Equipamentos
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Tipo local para categoria (até migration rodar)
type EquipmentCategory = 'COMPUTER' | 'PRINTER' | 'MONITOR' | 'PERIPHERAL' | 'NETWORK' | 'SOFTWARE' | 'OTHER';

interface CreatePurchaseDto {
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
    invoiceDate?: Date;
    warrantyMonths?: number;
    purchaseDate?: Date;
    notes?: string;
    createdById?: string;
}

interface UpdatePurchaseDto extends Partial<CreatePurchaseDto> {
    syncedToGlpi?: boolean;
    glpiAssetId?: number;
}

interface PurchaseFilters {
    sector?: string;
    category?: EquipmentCategory;
    startDate?: Date;
    endDate?: Date;
    supplierId?: string;
}

@Injectable()
export class PurchasesService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: PurchaseFilters) {
        const where: any = {};

        if (filters?.sector) {
            where.sector = filters.sector;
        }
        if (filters?.category) {
            where.category = filters.category;
        }
        if (filters?.supplierId) {
            where.supplierId = filters.supplierId;
        }
        if (filters?.startDate || filters?.endDate) {
            where.purchaseDate = {};
            if (filters.startDate) {
                where.purchaseDate.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.purchaseDate.lte = filters.endDate;
            }
        }

        return this.prisma.purchase.findMany({
            where,
            include: {
                supplier: { select: { id: true, name: true } },
            },
            orderBy: { purchaseDate: 'desc' },
        });
    }

    async findById(id: string) {
        const purchase = await this.prisma.purchase.findUnique({
            where: { id },
            include: {
                supplier: true,
            },
        });

        if (!purchase) {
            throw new NotFoundException('Compra não encontrada');
        }

        return purchase;
    }

    async create(dto: CreatePurchaseDto) {
        return this.prisma.purchase.create({
            data: {
                name: dto.name,
                category: dto.category || 'OTHER',
                serialNumber: dto.serialNumber,
                assetTag: dto.assetTag,
                quantity: dto.quantity || 1,
                unitPrice: new Decimal(dto.unitPrice),
                supplierId: dto.supplierId,
                supplierName: dto.supplierName,
                sector: dto.sector,
                location: dto.location,
                responsibleName: dto.responsibleName,
                invoiceNumber: dto.invoiceNumber,
                invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
                warrantyMonths: dto.warrantyMonths,
                purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
                notes: dto.notes,
                createdById: dto.createdById,
            },
            include: {
                supplier: { select: { id: true, name: true } },
            },
        });
    }

    async update(id: string, dto: UpdatePurchaseDto) {
        const data: any = { ...dto };

        if (dto.unitPrice !== undefined) {
            data.unitPrice = new Decimal(dto.unitPrice);
        }
        if (dto.invoiceDate) {
            data.invoiceDate = new Date(dto.invoiceDate);
        }
        if (dto.purchaseDate) {
            data.purchaseDate = new Date(dto.purchaseDate);
        }

        return this.prisma.purchase.update({
            where: { id },
            data,
            include: {
                supplier: { select: { id: true, name: true } },
            },
        });
    }

    async delete(id: string) {
        await this.prisma.purchase.delete({ where: { id } });
        return { success: true };
    }

    // Relatório mensal
    async getMonthlyReport(year: number, month: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const purchases = await this.prisma.purchase.findMany({
            where: {
                purchaseDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                supplier: { select: { name: true } },
            },
            orderBy: { purchaseDate: 'asc' },
        });

        // Agrupar por categoria
        const byCategory: Record<string, { count: number; total: number }> = {};
        // Agrupar por setor
        const bySector: Record<string, { count: number; total: number }> = {};

        let totalItems = 0;
        let totalValue = 0;

        for (const purchase of purchases) {
            const value = Number(purchase.unitPrice) * purchase.quantity;
            totalItems += purchase.quantity;
            totalValue += value;

            // Por categoria
            if (!byCategory[purchase.category]) {
                byCategory[purchase.category] = { count: 0, total: 0 };
            }
            byCategory[purchase.category].count += purchase.quantity;
            byCategory[purchase.category].total += value;

            // Por setor
            if (!bySector[purchase.sector]) {
                bySector[purchase.sector] = { count: 0, total: 0 };
            }
            bySector[purchase.sector].count += purchase.quantity;
            bySector[purchase.sector].total += value;
        }

        return {
            period: {
                year,
                month,
                startDate,
                endDate,
            },
            summary: {
                totalPurchases: purchases.length,
                totalItems,
                totalValue,
                averagePerItem: totalItems > 0 ? totalValue / totalItems : 0,
            },
            byCategory: Object.entries(byCategory).map(([category, data]) => ({
                category,
                ...data,
            })),
            bySector: Object.entries(bySector).map(([sector, data]) => ({
                sector,
                ...data,
            })),
            purchases: purchases.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                sector: p.sector,
                quantity: p.quantity,
                unitPrice: Number(p.unitPrice),
                totalPrice: Number(p.unitPrice) * p.quantity,
                purchaseDate: p.purchaseDate,
                supplier: p.supplier?.name || p.supplierName,
            })),
        };
    }

    // Relatório por setor
    async getSectorReport(sector: string, startDate?: Date, endDate?: Date) {
        const where: any = { sector };

        if (startDate || endDate) {
            where.purchaseDate = {};
            if (startDate) where.purchaseDate.gte = startDate;
            if (endDate) where.purchaseDate.lte = endDate;
        }

        const purchases = await this.prisma.purchase.findMany({
            where,
            include: {
                supplier: { select: { name: true } },
            },
            orderBy: { purchaseDate: 'desc' },
        });

        // Agrupar por categoria
        const byCategory: Record<string, { count: number; total: number }> = {};
        let totalValue = 0;

        for (const purchase of purchases) {
            const value = Number(purchase.unitPrice) * purchase.quantity;
            totalValue += value;

            if (!byCategory[purchase.category]) {
                byCategory[purchase.category] = { count: 0, total: 0 };
            }
            byCategory[purchase.category].count += purchase.quantity;
            byCategory[purchase.category].total += value;
        }

        return {
            sector,
            period: { startDate, endDate },
            summary: {
                totalPurchases: purchases.length,
                totalItems: purchases.reduce((sum, p) => sum + p.quantity, 0),
                totalValue,
            },
            byCategory: Object.entries(byCategory).map(([category, data]) => ({
                category,
                ...data,
            })),
            purchases,
        };
    }

    // Listar setores únicos (para dropdown)
    async getSectors() {
        const result = await this.prisma.purchase.findMany({
            select: { sector: true },
            distinct: ['sector'],
            orderBy: { sector: 'asc' },
        });
        return result.map(r => r.sector);
    }

    // Estatísticas do dashboard
    async getDashboardStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const [monthlyPurchases, allTimeStats] = await Promise.all([
            this.prisma.purchase.findMany({
                where: {
                    purchaseDate: { gte: startOfMonth, lte: endOfMonth },
                },
            }),
            this.prisma.purchase.aggregate({
                _count: true,
                _sum: { quantity: true },
            }),
        ]);

        const monthlyTotal = monthlyPurchases.reduce(
            (sum, p) => sum + Number(p.unitPrice) * p.quantity,
            0
        );
        const monthlyItems = monthlyPurchases.reduce((sum, p) => sum + p.quantity, 0);

        return {
            monthly: {
                count: monthlyPurchases.length,
                items: monthlyItems,
                total: monthlyTotal,
            },
            allTime: {
                count: allTimeStats._count,
                items: allTimeStats._sum.quantity || 0,
            },
        };
    }
}
