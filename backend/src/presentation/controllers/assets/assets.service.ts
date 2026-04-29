import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AssetCategory, AssetLifecycle, Sector } from '@prisma/client';

export interface CreateAssetInput {
  tag: string;
  serialNumber?: string;
  name: string;
  category: AssetCategory;
  status?: AssetLifecycle;
  sector: Sector;
  location?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: Date;
  warrantyEndsAt?: Date;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  category?: AssetCategory;
  status?: AssetLifecycle;
  sector?: Sector;
  location?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: Date;
  warrantyEndsAt?: Date;
  notes?: string;
  currentUserId?: string;
}

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    sector?: Sector;
    category?: AssetCategory;
    status?: AssetLifecycle;
    search?: string;
    location?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.sector) where.sector = filters.sector;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { tag: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          currentUser: { select: { id: true, name: true, email: true } },
          _count: { select: { assignments: true, tickets: true } },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: assets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        currentUser: { select: { id: true, name: true, email: true, phoneNumber: true } },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        licenses: { include: { license: true } },
        tickets: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, status: true, createdAt: true },
        },
      },
    });
    if (!asset) throw new NotFoundException(`Asset "${id}" not found`);
    return asset;
  }

  async findByTag(tag: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { tag },
      include: {
        currentUser: { select: { id: true, name: true, email: true } },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: 5,
          include: { user: { select: { name: true } } },
        },
      },
    });
    if (!asset) throw new NotFoundException(`Asset with tag "${tag}" not found`);
    return asset;
  }

  async create(data: CreateAssetInput) {
    const existing = await this.prisma.asset.findUnique({ where: { tag: data.tag } });
    if (existing) throw new ConflictException(`Asset with tag "${data.tag}" already exists`);

    return this.prisma.asset.create({
      data: {
        ...data,
        serialNumber: data.serialNumber || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyEndsAt: data.warrantyEndsAt ? new Date(data.warrantyEndsAt) : null,
      },
      include: { currentUser: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: UpdateAssetInput) {
    await this.findById(id);
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyEndsAt: data.warrantyEndsAt ? new Date(data.warrantyEndsAt) : undefined,
      },
      include: { currentUser: { select: { id: true, name: true } } },
    });
  }

  async assign(id: string, userId: string, reason?: string) {
    const asset = await this.findById(id);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User "${userId}" not found`);

    const assignment = await this.prisma.assetAssignment.create({
      data: {
        assetId: id,
        userId,
        reason,
        assignedAt: new Date(),
      },
    });

    const updated = await this.prisma.asset.update({
      where: { id },
      data: { currentUserId: userId },
      include: { currentUser: { select: { id: true, name: true } } },
    });

    return { assignment, asset: updated };
  }

  async returnAsset(id: string) {
    const asset = await this.findById(id);
    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId: id, returnedAt: null },
      orderBy: { assignedAt: 'desc' },
    });

    if (activeAssignment) {
      await this.prisma.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: { returnedAt: new Date() },
      });
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: { currentUserId: null },
      include: { currentUser: false },
    });

    return updated;
  }

  async getHistory(id: string) {
    await this.findById(id);
    return this.prisma.assetAssignment.findMany({
      where: { assetId: id },
      orderBy: { assignedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

async delete(id: string) {
    const asset = await this.findById(id);
    if (asset.currentUserId) throw new BadRequestException('Cannot delete asset that is currently assigned');
    await this.prisma.asset.delete({ where: { id } });
    return { success: true };
  }

  async getStats() {
    const [total, inStock, inUse, inMaintenance, retired, lost] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'IN_STOCK' } }),
      this.prisma.asset.count({ where: { status: 'IN_USE' } }),
      this.prisma.asset.count({ where: { status: 'IN_MAINTENANCE' } }),
      this.prisma.asset.count({ where: { status: 'RETIRED' } }),
      this.prisma.asset.count({ where: { status: 'LOST' } }),
    ]);
    return { total, inStock, inUse, inMaintenance, retired, lost };
  }
}