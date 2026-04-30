import { Test, TestingModule } from '@nestjs/testing';
import { ReturnAssetUseCase } from './return-asset.uc';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AssetLifecycle } from '@prisma/client';

describe('ReturnAssetUseCase', () => {
  let uc: ReturnAssetUseCase;

  const mockPrisma = {
    $transaction: jest.fn().mockImplementation(async (args) => {
      if (typeof args === 'function') {
        const mockTx = {
          asset: {
            findUnique: jest.fn().mockResolvedValue({ id: '1', name: 'Notebook', currentUserId: null, status: AssetLifecycle.IN_STOCK }),
            update: mockPrisma.asset.update,
          },
          assetAssignment: {
            update: mockPrisma.assetAssignment.update,
          },
        };
        return args(mockTx);
      }
      if (Array.isArray(args)) {
        return [
          { id: 'assign1', assetId: '1', userId: 'user1', returnedAt: new Date() },
          { id: '1', name: 'Notebook', currentUserId: null, status: AssetLifecycle.IN_STOCK },
        ];
      }
      return args;
    }),
    asset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    assetAssignment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnAssetUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    uc = module.get<ReturnAssetUseCase>(ReturnAssetUseCase);
  });

  it('should return asset to stock and mark assignment as returned', async () => {
    const asset = { id: '1', name: 'Notebook', currentUserId: 'user1', status: AssetLifecycle.IN_USE };
    const activeAssignment = { id: 'assign1', assetId: '1', userId: 'user1', returnedAt: null };

    mockPrisma.asset.findUnique.mockResolvedValue(asset);
    mockPrisma.assetAssignment.findFirst.mockResolvedValue(activeAssignment);
    mockPrisma.assetAssignment.update.mockResolvedValue({ ...activeAssignment, returnedAt: new Date() });
    mockPrisma.asset.update.mockResolvedValue({ ...asset, currentUserId: null, status: AssetLifecycle.IN_STOCK });

    const result = await uc.execute({ assetId: '1', returnedById: 'user1' });

    expect(mockPrisma.assetAssignment.update).toHaveBeenCalledWith({
      where: { id: 'assign1' },
      data: { returnedAt: expect.any(Date) },
    });
    expect(mockPrisma.asset.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { currentUserId: null, status: 'IN_STOCK' },
    });
    expect(result.asset!.currentUserId).toBeNull();
  });

  it('should throw NotFoundException when asset not found', async () => {
    mockPrisma.asset.findUnique.mockResolvedValue(null);
    await expect(uc.execute({ assetId: 'nonexistent', returnedById: 'user1' }))
      .rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when asset not currently assigned', async () => {
    mockPrisma.asset.findUnique.mockResolvedValue({ id: '1', name: 'Notebook', currentUserId: null });
    await expect(uc.execute({ assetId: '1', returnedById: 'user1' }))
      .rejects.toThrow(BadRequestException);
  });

  it('should handle asset with no active assignment gracefully', async () => {
    const asset = { id: '1', name: 'Notebook', currentUserId: 'user1', status: AssetLifecycle.IN_USE };
    mockPrisma.asset.findUnique.mockResolvedValue(asset);
    mockPrisma.assetAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.asset.update.mockResolvedValue({ ...asset, currentUserId: null, status: AssetLifecycle.IN_STOCK });

    const result = await uc.execute({ assetId: '1', returnedById: 'user1' });

    expect(mockPrisma.asset.update).toHaveBeenCalled();
    expect(result.asset!.currentUserId).toBeNull();
  });
});