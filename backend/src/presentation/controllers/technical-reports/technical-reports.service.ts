import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  Sector,
  TechnicalReportStatus,
  SignerRole,
  Prisma,
} from '@prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface CreateTechnicalReportInput {
  title: string;
  site: string;
  serviceDate: Date;
  engineerId?: string;
  technicianId?: string;
  assistants?: string[];
  summary: string;
  execution: string;
  materials: string;
  observations: string;
  ticketId?: string;
}

export interface UpdateTechnicalReportInput {
  title?: string;
  site?: string;
  serviceDate?: Date;
  engineerId?: string;
  technicianId?: string;
  assistants?: string[];
  summary?: string;
  execution?: string;
  materials?: string;
  observations?: string;
  ticketId?: string;
}

const DEFAULT_INCLUDE = {
  engineer: { select: { id: true, name: true, email: true } },
  technician: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  media: { orderBy: { createdAt: 'asc' as const } },
  annotations: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true, role: true } } },
  },
  signatures: { orderBy: { signedAt: 'asc' as const } },
} satisfies Prisma.TechnicalReportInclude;

const VALID_TRANSITIONS: Record<TechnicalReportStatus, TechnicalReportStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REWORK'],
  REWORK: ['SUBMITTED'],
  APPROVED: [],
};

@Injectable()
export class TechnicalReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    sector: Sector;
    status?: TechnicalReportStatus;
    serviceDateFrom?: Date;
    serviceDateTo?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 30;
    const skip = (page - 1) * limit;

    const where: Prisma.TechnicalReportWhereInput = {
      sector: filters.sector,
      deletedAt: null,
    };
    if (filters.status) where.status = filters.status;
    if (filters.serviceDateFrom || filters.serviceDateTo) {
      where.serviceDate = {};
      if (filters.serviceDateFrom) where.serviceDate.gte = filters.serviceDateFrom;
      if (filters.serviceDateTo) where.serviceDate.lte = filters.serviceDateTo;
    }
    if (filters.search) {
      where.OR = [
        { number: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { site: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      this.prisma.technicalReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          engineer: { select: { id: true, name: true } },
          technician: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { media: true, annotations: true, signatures: true } },
        },
      }),
      this.prisma.technicalReport.count({ where }),
    ]);

    return {
      data: reports,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, sector: Sector) {
    const report = await this.prisma.technicalReport.findFirst({
      where: { id, sector, deletedAt: null },
      include: DEFAULT_INCLUDE,
    });
    if (!report) throw new NotFoundException('Relatório técnico não encontrado');
    return report;
  }

  async create(input: CreateTechnicalReportInput, userId: string, sector: Sector) {
    const number = await this.generateNumber();
    return this.prisma.technicalReport.create({
      data: {
        number,
        sector,
        title: input.title,
        site: input.site,
        serviceDate: input.serviceDate,
        engineerId: input.engineerId,
        technicianId: input.technicianId,
        assistants: input.assistants ?? [],
        summary: input.summary,
        execution: input.execution,
        materials: input.materials,
        observations: input.observations,
        ticketId: input.ticketId,
        createdById: userId,
        status: 'DRAFT',
      },
      include: DEFAULT_INCLUDE,
    });
  }

  async update(id: string, input: UpdateTechnicalReportInput, sector: Sector) {
    const existing = await this.findById(id, sector);
    if (existing.status === 'APPROVED') {
      throw new BadRequestException('Relatório aprovado não pode ser editado');
    }

    const data: Prisma.TechnicalReportUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.site !== undefined) data.site = input.site;
    if (input.serviceDate !== undefined) data.serviceDate = input.serviceDate;
    if (input.engineerId !== undefined) {
      data.engineer = input.engineerId
        ? { connect: { id: input.engineerId } }
        : { disconnect: true };
    }
    if (input.technicianId !== undefined) {
      data.technician = input.technicianId
        ? { connect: { id: input.technicianId } }
        : { disconnect: true };
    }
    if (input.assistants !== undefined) data.assistants = input.assistants;
    if (input.summary !== undefined) data.summary = input.summary;
    if (input.execution !== undefined) data.execution = input.execution;
    if (input.materials !== undefined) data.materials = input.materials;
    if (input.observations !== undefined) data.observations = input.observations;
    if (input.ticketId !== undefined) {
      data.ticket = input.ticketId
        ? { connect: { id: input.ticketId } }
        : { disconnect: true };
    }

    return this.prisma.technicalReport.update({
      where: { id },
      data,
      include: DEFAULT_INCLUDE,
    });
  }

  async setStatus(id: string, next: TechnicalReportStatus, sector: Sector) {
    const existing = await this.findById(id, sector);
    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Transição inválida: ${existing.status} → ${next}`,
      );
    }
    return this.prisma.technicalReport.update({
      where: { id },
      data: { status: next },
      include: DEFAULT_INCLUDE,
    });
  }

  async softDelete(id: string, sector: Sector) {
    const existing = await this.findById(id, sector);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Apenas rascunhos (DRAFT) podem ser deletados');
    }
    return this.prisma.technicalReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // -------- Media --------

  async addMedia(
    id: string,
    file: Express.Multer.File,
    userId: string,
    sector: Sector,
  ) {
    await this.findById(id, sector);
    return this.prisma.technicalReportMedia.create({
      data: {
        reportId: id,
        filename: file.originalname,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: userId,
      },
    });
  }

  async getMedia(reportId: string, mediaId: string, sector: Sector) {
    await this.findById(reportId, sector);
    const media = await this.prisma.technicalReportMedia.findFirst({
      where: { id: mediaId, reportId },
    });
    if (!media) throw new NotFoundException('Mídia não encontrada');
    return media;
  }

  async deleteMedia(
    reportId: string,
    mediaId: string,
    userId: string,
    userRole: string,
    sector: Sector,
  ) {
    await this.findById(reportId, sector);
    const media = await this.prisma.technicalReportMedia.findFirst({
      where: { id: mediaId, reportId },
    });
    if (!media) throw new NotFoundException('Mídia não encontrada');

    const isAuthor = media.uploadedBy === userId;
    const isAdmin = ['ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS'].includes(userRole);
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Sem permissão para remover esta mídia');
    }

    await this.prisma.technicalReportMedia.delete({ where: { id: mediaId } });
    await fs.unlink(media.path).catch(() => undefined);
    return { success: true };
  }

  // -------- Annotations --------

  async addAnnotation(
    reportId: string,
    input: { authorRole: SignerRole; field: string; comment: string },
    userId: string,
    sector: Sector,
  ) {
    await this.findById(reportId, sector);
    return this.prisma.technicalReportAnnotation.create({
      data: {
        reportId,
        authorId: userId,
        authorRole: input.authorRole,
        field: input.field,
        comment: input.comment,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async resolveAnnotation(reportId: string, annId: string, sector: Sector) {
    await this.findById(reportId, sector);
    const annotation = await this.prisma.technicalReportAnnotation.findFirst({
      where: { id: annId, reportId },
    });
    if (!annotation) throw new NotFoundException('Anotação não encontrada');
    return this.prisma.technicalReportAnnotation.update({
      where: { id: annId },
      data: { resolved: true, resolvedAt: new Date() },
    });
  }

  // -------- Signature --------

  async getSignature(reportId: string, sigId: string, sector: Sector) {
    await this.findById(reportId, sector);
    const sig = await this.prisma.technicalReportSignature.findFirst({
      where: { id: sigId, reportId },
    });
    if (!sig) throw new NotFoundException('Assinatura não encontrada');
    return sig;
  }

  // Setor → role de admin do setor, único habilitado a assinar como ENGINEER
  // (a tela rotula esse mesmo campo "Analista" para TI, mas é o mesmo SignerRole).
  private static readonly SECTOR_ENGINEER_ROLE: Record<Sector, string> = {
    TI: 'ADMIN_TI',
    ELECTRIC: 'ADMIN_ELECTRIC',
    COMPRAS: 'ADMIN_COMPRAS',
  };

  async addSignature(
    reportId: string,
    file: Express.Multer.File,
    input: { role: SignerRole; signerName: string },
    userId: string | null,
    userRole: string | undefined,
    ip: string | undefined,
    sector: Sector,
  ) {
    await this.findById(reportId, sector);

    let creaNumber: string | null = null;
    if (input.role === SignerRole.ENGINEER) {
      const requiredRole = TechnicalReportsService.SECTOR_ENGINEER_ROLE[sector];
      if (userRole !== requiredRole && userRole !== 'ADMIN') {
        throw new ForbiddenException(
          'Somente o responsável (admin) do setor pode assinar como Engenheiro/Analista',
        );
      }

      if (sector === Sector.ELECTRIC) {
        const user = userId
          ? await this.prisma.user.findUnique({
              where: { id: userId },
              select: { creaNumber: true },
            })
          : null;
        if (!user?.creaNumber) {
          throw new BadRequestException(
            'Cadastre seu número de CREA antes de assinar laudos elétricos',
          );
        }
        creaNumber = user.creaNumber;
      }
    }

    if (file.mimetype !== 'image/png') {
      await fs.unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Assinatura deve ser PNG');
    }

    const targetDir = join('./uploads/reports/signatures');
    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = join(targetDir, `${file.filename}`);
    if (file.path !== targetPath) {
      await fs.rename(file.path, targetPath).catch(async () => {
        await fs.copyFile(file.path, targetPath);
        await fs.unlink(file.path).catch(() => undefined);
      });
    }

    return this.prisma.technicalReportSignature.create({
      data: {
        reportId,
        signerId: userId,
        signerName: input.signerName,
        role: input.role,
        imagePath: targetPath,
        ip: ip ?? null,
        creaNumber,
      },
    });
  }

  // -------- Numbering --------

  private async generateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RT-${year}-`;
    const last = await this.prisma.technicalReport.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const next = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }
}
