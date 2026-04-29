import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LicenseType } from '@prisma/client';
import { CreateLicenseDto, UpdateLicenseDto, AssignLicenseDto } from './dto';

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    search?: string;
    type?: LicenseType;
    expired?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.search) {
      where.OR = [
        { software: { contains: filters.search, mode: 'insensitive' } },
        { vendor: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.expired === true) {
      where.expiresAt = { lt: new Date() };
    } else if (filters?.expired === false) {
      where.expiresAt = { gte: new Date() };
    }

    const [licenses, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.license.count({ where }),
    ]);

    return {
      data: licenses,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            asset: { select: { id: true, name: true, tag: true } },
          },
        },
      },
    });
    if (!license) throw new NotFoundException('Licença não encontrada');
    return license;
  }

  async create(dto: CreateLicenseDto) {
    return this.prisma.license.create({
      data: {
        software: dto.software,
        vendor: dto.vendor,
        licenseKey: dto.licenseKey,
        type: dto.type,
        seats: dto.seats || 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        cost: dto.cost ? dto.cost : null,
      },
    });
  }

  async update(id: string, dto: UpdateLicenseDto) {
    await this.findOne(id);
    return this.prisma.license.update({
      where: { id },
      data: {
        software: dto.software,
        vendor: dto.vendor,
        licenseKey: dto.licenseKey,
        type: dto.type,
        seats: dto.seats,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        cost: dto.cost,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.license.delete({ where: { id } });
    return { deleted: true };
  }

  async assign(id: string, dto: AssignLicenseDto) {
    const license = await this.findOne(id);

    if (!dto.assetId && !dto.userId) {
      throw new BadRequestException('Informe assetId ou userId');
    }

    if (license.seats > 0) {
      const currentAssignments = await this.prisma.licenseAssignment.count({
        where: { licenseId: id, returnedAt: null },
      });
      if (currentAssignments >= license.seats) {
        throw new BadRequestException(`Licença já atingiu o limite de ${license.seats} assentos`);
      }
    }

    return this.prisma.licenseAssignment.create({
      data: {
        licenseId: id,
        assetId: dto.assetId || null,
        userId: dto.userId || null,
      },
    });
  }

  async unassign(assignmentId: string) {
    const assignment = await this.prisma.licenseAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Atribuição não encontrada');

    return this.prisma.licenseAssignment.update({
      where: { id: assignmentId },
      data: { returnedAt: new Date() },
    });
  }

  async getStats() {
    const [total, expired, active, totalAssignments] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.count({ where: { expiresAt: { lt: new Date() } } }),
      this.prisma.license.count({ where: { expiresAt: { gte: new Date() } } }),
      this.prisma.licenseAssignment.count({ where: { returnedAt: null } }),
    ]);

    return { total, expired, active, totalAssignments };
  }
}
