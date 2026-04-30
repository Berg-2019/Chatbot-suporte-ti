import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface AssignAssetInput {
  assetId: string;
  userId: string;
  reason?: string;
  assignedById: string;
}

@Injectable()
export class AssignAssetUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: AssignAssetInput) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) throw new NotFoundException(`Asset "${input.assetId}" not found`);

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) throw new NotFoundException(`User "${input.userId}" not found`);

    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId: input.assetId, returnedAt: null },
    });

    const [assignment, updatedAsset] = await this.prisma.$transaction([
      this.prisma.assetAssignment.create({
        data: {
          assetId: input.assetId,
          userId: input.userId,
          reason: input.reason,
          assignedAt: new Date(),
        },
      }),
      this.prisma.asset.update({
        where: { id: input.assetId },
        data: {
          currentUserId: input.userId,
          status: 'IN_USE',
        },
        include: {
          currentUser: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return { assignment, asset: updatedAsset, previousAssignment: activeAssignment };
  }
}