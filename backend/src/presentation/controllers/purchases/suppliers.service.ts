/**
 * Suppliers Service - Gerenciamento de Fornecedores
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface CreateSupplierDto {
    name: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    address?: string;
}

interface UpdateSupplierDto extends Partial<CreateSupplierDto> {
    active?: boolean;
}

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    async findAll(includeInactive = false) {
        const where = includeInactive ? {} : { active: true };

        return this.prisma.supplier.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { purchases: true } },
            },
        });
    }

    async findById(id: string) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id },
            include: {
                purchases: {
                    orderBy: { purchaseDate: 'desc' },
                    take: 10,
                },
                _count: { select: { purchases: true } },
            },
        });

        if (!supplier) {
            throw new NotFoundException('Fornecedor não encontrado');
        }

        return supplier;
    }

    async create(dto: CreateSupplierDto) {
        // Verificar se já existe
        const existing = await this.prisma.supplier.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new ConflictException('Já existe um fornecedor com este nome');
        }

        return this.prisma.supplier.create({
            data: {
                name: dto.name,
                cnpj: dto.cnpj,
                phone: dto.phone,
                email: dto.email,
                address: dto.address,
            },
        });
    }

    async update(id: string, dto: UpdateSupplierDto) {
        return this.prisma.supplier.update({
            where: { id },
            data: dto,
        });
    }

    async deactivate(id: string) {
        return this.prisma.supplier.update({
            where: { id },
            data: { active: false },
        });
    }
}
