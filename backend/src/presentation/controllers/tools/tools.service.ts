import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ToolStatus, ToolCategory } from '@prisma/client';

@Injectable()
export class ToolsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { status?: string; stockType?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.stockType) where.stockType = params.stockType;

    return this.prisma.tool.findMany({
      where,
      include: {
        loans: {
          where: { returnedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.tool.findUnique({
      where: { id },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async create(data: {
    name: string;
    category: ToolCategory;
    serialNumber?: string;
    brand?: string;
    location?: string;
    notes?: string;
    stockType?: string;
  }) {
    return this.prisma.tool.create({
      data: {
        name: data.name,
        category: data.category || 'MANUAL',
        serialNumber: data.serialNumber,
        brand: data.brand,
        location: data.location,
        notes: data.notes,
        stockType: (data.stockType as any) || 'TI',
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    category: ToolCategory;
    status: ToolStatus;
    serialNumber: string;
    brand: string;
    location: string;
    notes: string;
  }>) {
    return this.prisma.tool.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.tool.delete({ where: { id } });
  }

  async loan(id: string, data: {
    borrower: string;
    reason?: string;
    expectedReturn?: string;
    loanedBy?: string;
  }) {
    const tool = await this.prisma.tool.update({
      where: { id },
      data: { status: 'LOANED' },
    });

    const loan = await this.prisma.toolLoan.create({
      data: {
        toolId: id,
        borrower: data.borrower,
        reason: data.reason,
        expectedReturn: data.expectedReturn ? new Date(data.expectedReturn) : null,
        loanedBy: data.loanedBy,
      },
    });

    return { tool, loan };
  }

  async returnTool(id: string, returnedBy?: string) {
    const tool = await this.prisma.tool.update({
      where: { id },
      data: { status: 'AVAILABLE' },
    });

    const loan = await this.prisma.toolLoan.findFirst({
      where: { toolId: id, returnedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (loan) {
      await this.prisma.toolLoan.update({
        where: { id: loan.id },
        data: {
          returnedAt: new Date(),
          returnedBy,
        },
      });
    }

    return { tool, loan };
  }

  async getLoans(params?: { returned?: boolean }) {
    const where: any = {};
    if (params?.returned === false) {
      where.returnedAt = null;
    } else if (params?.returned === true) {
      where.returnedAt = { not: null };
    }

    return this.prisma.toolLoan.findMany({
      where,
      include: {
        tool: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}