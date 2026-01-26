/**
 * Parts Service - Controle de Estoque de Peças
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface CreatePartDto {
  name: string;
  code: string;
  description?: string;
  quantity?: number;
  minQuantity?: number;
  unitCost: number;
}

interface UpdatePartDto {
  name?: string;
  description?: string;
  quantity?: number;
  minQuantity?: number;
  unitCost?: number;
  active?: boolean;
}

@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { active: true };
    
    return this.prisma.part.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { usages: true } },
      },
    });
  }

  async findById(id: string) {
    const part = await this.prisma.part.findUnique({
      where: { id },
      include: {
        usages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            ticket: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException('Peça não encontrada');
    }

    return part;
  }

  async findByCode(code: string) {
    return this.prisma.part.findUnique({ where: { code } });
  }

  async create(dto: CreatePartDto) {
    return this.prisma.part.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        quantity: dto.quantity || 0,
        minQuantity: dto.minQuantity || 5,
        unitCost: new Decimal(dto.unitCost),
      },
    });
  }

  async update(id: string, dto: UpdatePartDto) {
    const data: any = { ...dto };
    if (dto.unitCost !== undefined) {
      data.unitCost = new Decimal(dto.unitCost);
    }

    return this.prisma.part.update({
      where: { id },
      data,
    });
  }

  async addStock(id: string, quantity: number) {
    return this.prisma.part.update({
      where: { id },
      data: {
        quantity: { increment: quantity },
      },
    });
  }

  async removeStock(id: string, quantity: number) {
    const part = await this.prisma.part.findUnique({ where: { id } });
    if (!part) throw new NotFoundException('Peça não encontrada');
    
    if (part.quantity < quantity) {
      throw new Error('Estoque insuficiente');
    }

    return this.prisma.part.update({
      where: { id },
      data: {
        quantity: { decrement: quantity },
      },
    });
  }

  async getLowStock() {
    return this.prisma.part.findMany({
      where: {
        active: true,
        quantity: { lte: this.prisma.part.fields.minQuantity as any },
      },
    });
  }

  async getLowStockAlerts() {
    // Usando raw query para comparar quantity com minQuantity
    return this.prisma.$queryRaw`
      SELECT * FROM parts 
      WHERE active = true AND quantity <= "minQuantity"
      ORDER BY quantity ASC
    `;
  }

  async deactivate(id: string) {
    return this.prisma.part.update({
      where: { id },
      data: { active: false },
    });
  }
}
