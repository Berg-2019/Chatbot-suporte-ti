/**
 * Assets Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AssetCategory, AssetLifecycle, Sector } from '@prisma/client';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('AssetsService', () => {
  let service: AssetsService;

  const mockPrismaService = {
    asset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    assetAssignment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  describe('findAll', () => {
    it('should return paginated assets', async () => {
      const mockAssets = [
        { id: '1', name: 'Notebook Dell', tag: 'PAT001', category: AssetCategory.LAPTOP, sector: 'TI' as Sector },
        { id: '2', name: 'Impressora HP', tag: 'PAT002', category: AssetCategory.PRINTER, sector: 'TI' as Sector },
      ];

      mockPrismaService.asset.findMany.mockResolvedValue(mockAssets);
      mockPrismaService.asset.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by sector', async () => {
      mockPrismaService.asset.findMany.mockResolvedValue([]);
      mockPrismaService.asset.count.mockResolvedValue(0);

      await service.findAll({ sector: 'ELECTRIC' as Sector });

      expect(mockPrismaService.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sector: 'ELECTRIC' }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.asset.findMany.mockResolvedValue([]);
      mockPrismaService.asset.count.mockResolvedValue(0);

      await service.findAll({ category: AssetCategory.PRINTER });

      expect(mockPrismaService.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: AssetCategory.PRINTER }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.asset.findMany.mockResolvedValue([]);
      mockPrismaService.asset.count.mockResolvedValue(0);

      await service.findAll({ status: AssetLifecycle.IN_USE });

      expect(mockPrismaService.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: AssetLifecycle.IN_USE }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when asset not found', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return asset with currentUser and counts', async () => {
      const mockAsset = {
        id: '1',
        name: 'Notebook Dell',
        tag: 'PAT001',
        currentUser: { id: '1', name: 'João Silva', email: 'joao@empresa.com', phoneNumber: '11999999999' },
        _count: { assignments: 2, tickets: 1 },
      };
      mockPrismaService.asset.findUnique.mockResolvedValue(mockAsset);

      const result = await service.findById('1');

      expect(result.name).toBe('Notebook Dell');
    });
  });

  describe('create', () => {
    it('should create asset with required fields', async () => {
      const dto = {
        tag: 'PAT_NEW_001',
        name: 'Monitor LG',
        category: AssetCategory.PERIPHERAL,
        sector: 'TI' as Sector,
      };

      mockPrismaService.asset.findUnique.mockResolvedValue(null);
      mockPrismaService.asset.create.mockResolvedValue({ id: '1', ...dto, status: AssetLifecycle.IN_STOCK });

      const result = await service.create(dto);

      expect(mockPrismaService.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tag: 'PAT_NEW_001',
            name: 'Monitor LG',
            sector: 'TI',
          }),
        }),
      );
      expect(result.tag).toBe('PAT_NEW_001');
    });

    it('should throw ConflictException when tag already exists', async () => {
      const dto = {
        tag: 'PAT_EXISTING',
        name: 'Some Asset',
        category: AssetCategory.COMPUTER,
        sector: 'TI' as Sector,
      };

      mockPrismaService.asset.findUnique.mockResolvedValue({ id: '1', tag: 'PAT_EXISTING' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update asset fields', async () => {
      const existing = { id: '1', name: 'Old Name', tag: 'PAT001', sector: 'TI' as Sector, status: AssetLifecycle.IN_STOCK };
      mockPrismaService.asset.findUnique.mockResolvedValue(existing);
      mockPrismaService.asset.update.mockResolvedValue({ ...existing, name: 'New Name' });

      const result = await service.update('1', { name: 'New Name' });

      expect(mockPrismaService.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
    });

    it('should throw NotFoundException when updating nonexistent asset', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('should assign asset to user and create history record', async () => {
      const asset = { id: '1', name: 'Notebook', currentUserId: null };
      const user = { id: 'user1', name: 'João Silva' };
      mockPrismaService.asset.findUnique.mockResolvedValue(asset);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.assetAssignment.create.mockResolvedValue({ id: 'assign1' });
      mockPrismaService.asset.update.mockResolvedValue({ ...asset, currentUserId: 'user1' });

      const result = await service.assign('1', 'user1', 'user-admin');

      expect(mockPrismaService.asset.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { currentUserId: 'user1' },
        include: { currentUser: { select: { id: true, name: true } } },
      });
    });

    it('should throw NotFoundException when asset not found', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue(null);

      await expect(service.assign('nonexistent', 'user1', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user not found', async () => {
      const asset = { id: '1', name: 'Notebook', currentUserId: null };
      mockPrismaService.asset.findUnique.mockResolvedValue(asset);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assign('1', 'nonexistent', 'reason')).rejects.toThrow(NotFoundException);
    });
  });

  describe('returnAsset', () => {
    it('should clear currentUserId and set returnedAt on active assignment', async () => {
      const asset = { id: '1', name: 'Notebook', currentUserId: 'user1' };
      const activeAssignment = { id: 'assign1', assetId: '1', returnedAt: null };

      mockPrismaService.asset.findUnique.mockResolvedValue(asset);
      mockPrismaService.assetAssignment.findFirst.mockResolvedValue(activeAssignment);
      mockPrismaService.assetAssignment.update.mockResolvedValue({ ...activeAssignment, returnedAt: new Date() });
      mockPrismaService.asset.update.mockResolvedValue({ ...asset, currentUserId: null });

      const result = await service.returnAsset('1');

      expect(mockPrismaService.assetAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assign1' },
        data: { returnedAt: expect.any(Date) },
      });
      expect(mockPrismaService.asset.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { currentUserId: null },
        include: { currentUser: false },
      });
    });
  });
});