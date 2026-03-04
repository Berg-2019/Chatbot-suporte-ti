/**
 * Labels & Tags Service
 * Gerencia labels/tags de tickets para organização e filtros
 */

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface CreateLabelDto {
  ticketId: string;
  label: string;
  color?: string;
}

@Injectable()
export class LabelsService {
  private readonly logger = new Logger(LabelsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Adiciona label a um ticket
   */
  async addLabel(dto: CreateLabelDto) {
    // Verificar se ticket existe
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${dto.ticketId} não encontrado`);
    }

    // Verificar se label já existe no ticket
    const existing = await this.prisma.ticketLabel.findUnique({
      where: {
        ticketId_label: {
          ticketId: dto.ticketId,
          label: dto.label,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Label "${dto.label}" já existe neste ticket`);
    }

    // Criar label
    const label = await this.prisma.ticketLabel.create({
      data: {
        ticketId: dto.ticketId,
        label: dto.label,
        color: dto.color || this.generateRandomColor(),
      },
    });

    this.logger.log(`✅ Label "${dto.label}" adicionada ao ticket ${dto.ticketId}`);

    return label;
  }

  /**
   * Remove label de um ticket
   */
  async removeLabel(ticketId: string, label: string) {
    const existing = await this.prisma.ticketLabel.findUnique({
      where: {
        ticketId_label: { ticketId, label },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Label "${label}" não encontrada neste ticket`);
    }

    await this.prisma.ticketLabel.delete({
      where: { id: existing.id },
    });

    this.logger.log(`🗑️ Label "${label}" removida do ticket ${ticketId}`);

    return { message: 'Label removida com sucesso' };
  }

  /**
   * Lista labels de um ticket
   */
  async getTicketLabels(ticketId: string) {
    return this.prisma.ticketLabel.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Lista todas as labels únicas no sistema
   */
  async getAllUniqueLabels() {
    const labels = await this.prisma.ticketLabel.findMany({
      distinct: ['label'],
      select: {
        label: true,
        color: true,
      },
      orderBy: { label: 'asc' },
    });

    // Contar uso de cada label
    const labelsWithCount = await Promise.all(
      labels.map(async (l: { label: string; color: string | null }) => {
        const count = await this.prisma.ticketLabel.count({
          where: { label: l.label },
        });

        return {
          label: l.label,
          color: l.color,
          usageCount: count,
        };
      }),
    );

    return labelsWithCount.sort((a: any, b: any) => b.usageCount - a.usageCount);
  }

  /**
   * Busca tickets por label
   */
  async getTicketsByLabel(label: string) {
    const ticketLabels = await this.prisma.ticketLabel.findMany({
      where: { label },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return ticketLabels.map((tl: any) => tl.ticket);
  }

  /**
   * Estatísticas de uso de labels
   */
  async getStatistics() {
    const [totalLabels, uniqueLabels, mostUsed] = await Promise.all([
      // Total de labels (contando duplicatas)
      this.prisma.ticketLabel.count(),

      // Labels únicas
      this.prisma.ticketLabel.findMany({
        distinct: ['label'],
      }),

      // Labels mais usadas (top 10)
      this.prisma.ticketLabel.groupBy({
        by: ['label'],
        _count: true,
        orderBy: {
          _count: {
            label: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalLabels,
      uniqueLabelsCount: uniqueLabels.length,
      mostUsedLabels: mostUsed.map((l: any) => ({
        label: l.label,
        count: l._count,
      })),
    };
  }

  /**
   * Gera cor aleatória para label
   */
  private generateRandomColor(): string {
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#f59e0b', // amber
      '#eab308', // yellow
      '#84cc16', // lime
      '#22c55e', // green
      '#10b981', // emerald
      '#14b8a6', // teal
      '#06b6d4', // cyan
      '#0ea5e9', // sky
      '#3b82f6', // blue
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#a855f7', // purple
      '#d946ef', // fuchsia
      '#ec4899', // pink
      '#f43f5e', // rose
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Adiciona múltiplas labels de uma vez
   */
  async addMultipleLabels(ticketId: string, labels: string[]) {
    const results = await Promise.allSettled(
      labels.map((label) => this.addLabel({ ticketId, label })),
    );

    const added = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      added,
      failed,
      total: labels.length,
    };
  }
}
