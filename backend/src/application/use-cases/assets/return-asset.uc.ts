import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface ReturnAssetInput {
  assetId: string;
  returnedById: string;
}

@Injectable()
export class ReturnAssetUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ReturnAssetInput) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) throw new NotFoundException(`Asset "${input.assetId}" not found`);

    if (!asset.currentUserId) {
      throw new BadRequestException('Asset is not currently assigned to any user');
    }

    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId: input.assetId, returnedAt: null },
      orderBy: { assignedAt: 'desc' },
    });

    const updatedAsset = await this.prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: input.assetId },
        data: { currentUserId: null, status: 'IN_STOCK' },
      });
      if (activeAssignment) {
        await tx.assetAssignment.update({
          where: { id: activeAssignment.id },
          data: { returnedAt: new Date() },
        });
      }
      return tx.asset.findUnique({ where: { id: input.assetId } });
    });

    return { asset: updatedAsset, assignment: activeAssignment };
  }
}