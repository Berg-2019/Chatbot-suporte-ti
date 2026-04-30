import { Test, TestingModule } from '@nestjs/testing';
import { AssignAssetUseCase } from './assign-asset.uc';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Sector } from '@prisma/client';

describe('AssignAssetUseCase', () => {
  let uc: AssignAssetUseCase;

  const mockPrisma = {
    asset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    assetAssignment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignAssetUseCase,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    uc = module.get<AssignAssetUseCase>(AssignAssetUseCase);
  });

  it('should assign asset to user and create history record', async () => {
    const asset = { id: '1', name: 'Notebook', tag: 'PAT001', status: AssetLifecycle.IN_STOCK, currentUserId: null };
    const user = { id: 'user1', name: 'João Silva', sector: 'TI' as Sector };

    mockPrisma.asset.findUnique.mockResolvedValue(asset);
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.assetAssignment.findFirst.mockResolvedValue(null);
    mockPrisma.assetAssignment.create.mockResolvedValue({ id: 'assign1', assetId: '1', userId: 'user1' });
    mockPrisma.asset.update.mockResolvedValue({ ...asset, currentUserId: 'user1', status: AssetLifecycle.IN_USE });

    const result = await uc.execute({ assetId: '1', userId: 'user1', reason: 'Uso temporário', assignedById: 'admin1' });

    expect(mockPrisma.assetAssignment.create).toHaveBeenCalledWith({
      data: {
        assetId: '1',
        userId: 'user1',
        reason: 'Uso temporário',
        assignedAt: expect.any(Date),
      },
    });
    expect(mockPrisma.asset.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { currentUserId: 'user1', status: 'IN_USE' },
      include: { currentUser: { select: { id: true, name: true, email: true } } },
    });
    expect(result.asset.currentUserId).toBe('user1');
  });

  it('should throw NotFoundException when asset not found', async () => {
    mockPrisma.asset.findUnique.mockResolvedValue(null);
    await expect(uc.execute({ assetId: 'nonexistent', userId: 'user1', assignedById: 'admin1' }))
      .rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when user not found', async () => {
    mockPrisma.asset.findUnique.mockResolvedValue({ id: '1', name: 'Notebook', currentUserId: null });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(uc.execute({ assetId: '1', userId: 'nonexistent', assignedById: 'admin1' }))
      .rejects.toThrow(NotFoundException);
  });

  it('should return previousAssignment when reassigning', async () => {
    const asset = { id: '1', name: 'Notebook', tag: 'PAT001', status: AssetLifecycle.IN_USE, currentUserId: 'oldUser' };
    const user = { id: 'newUser', name: 'João Silva', sector: 'TI' as Sector };
    const previousAssignment = { id: 'assignOld', assetId: '1', userId: 'oldUser', returnedAt: null };

    mockPrisma.asset.findUnique.mockResolvedValue(asset);
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.assetAssignment.findFirst.mockResolvedValue(previousAssignment);
    mockPrisma.assetAssignment.create.mockResolvedValue({ id: 'assignNew' });
    mockPrisma.asset.update.mockResolvedValue({ ...asset, currentUserId: 'newUser' });

    const result = await uc.execute({ assetId: '1', userId: 'newUser', assignedById: 'admin1' });

    expect(result.previousAssignment).toEqual(previousAssignment);
  });
});