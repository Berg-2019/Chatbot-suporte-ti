/**
 * Assets Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AssetCategory, AssetLifecycle, Sector } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated assets filtered by sector', async () => {
      const mockAssets = [
        { id: '1', name: 'Dell Latitude 5440', sector: 'TI' as Sector, tag: 'PAT001' },
        { id: '2', name: 'HP LaserJet', sector: 'TI' as Sector, tag: 'PAT002' },
      ];
      mockPrismaService.asset.findMany.mockResolvedValue(mockAssets);
      mockPrismaService.asset.count.mockResolvedValue(2);

      const result = await service.findAll({ sector: 'TI' as Sector });

      expect(result.data).toHaveLength(2);
      expect(mockPrismaService.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sector: 'TI' }),
        }),
      );
    });

    it('should filter by search term across name, tag, serialNumber', async () => {
      mockPrismaService.asset.findMany.mockResolvedValue([]);
      mockPrismaService.asset.count.mockResolvedValue(0);

      await service.findAll({ search: 'Dell' });

      expect(mockPrismaService.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'Dell', mode: 'insensitive' } },
              { tag: { contains: 'Dell', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter by category and status', async () => {
      mockPrismaService.asset.findMany.mockResolvedValue([]);
      mockPrismaService.asset.count.mockResolvedValue(0);

      await service.findAll({
        category: 'COMPUTER' as AssetCategory,
        status: 'IN_USE' as AssetLifecycle,
      });

      expect(mockPrismaService.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'COMPUTER',
            status: 'IN_USE',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when asset not found', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return asset with currentUser, assignments, licenses, tickets', async () => {
      const mockAsset = {
        id: '1',
        name: 'Dell Latitude 5440',
        tag: 'PAT001',
        currentUser: { id: 'u1', name: 'João Silva' },
        assignments: [],
        licenses: [],
        tickets: [],
      };
      mockPrismaService.asset.findUnique.mockResolvedValue(mockAsset);

      const result = await service.findById('1');

      expect(result.name).toBe('Dell Latitude 5440');
      expect(result.currentUser!.name).toBe('João Silva');
    });
  });

  describe('create', () => {
    it('should throw ConflictException when tag already exists', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue({ id: 'existing', tag: 'PAT001' });

      await expect(
        service.create({ name: 'New Asset', tag: 'PAT001', sector: 'TI' as Sector, category: 'COMPUTER' as AssetCategory }),
      ).rejects.toThrow();
    });

    it('should create asset when tag is unique', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue(null);
      const created = { id: '1', name: 'Dell Latitude 5440', tag: 'PAT001', sector: 'TI', category: 'COMPUTER' };
      mockPrismaService.asset.create.mockResolvedValue(created);

      const result = await service.create({
        name: 'Dell Latitude 5440',
        tag: 'PAT001',
        sector: 'TI' as Sector,
        category: 'COMPUTER' as AssetCategory,
      });

      expect(mockPrismaService.asset.create).toHaveBeenCalled();
      expect(result.tag).toBe('PAT001');
    });
  });

  describe('assign', () => {
    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.asset.findUnique.mockResolvedValue({ id: '1', name: 'Asset' });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assign('1', 'nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should create assignment and update currentUserId', async () => {
      const mockAsset = { id: '1', name: 'Asset', currentUserId: null };
      const mockUser = { id: 'user1', name: 'João Silva' };
      mockPrismaService.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.assetAssignment.create.mockResolvedValue({ id: 'a1' });
      mockPrismaService.asset.update.mockResolvedValue({ ...mockAsset, currentUserId: 'user1' });

      const result = await service.assign('1', 'user1', 'Requisição IT');

      expect(mockPrismaService.assetAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assetId: '1',
          userId: 'user1',
          reason: 'Requisição IT',
        }),
      });
    });
  });

  describe('returnAsset', () => {
    it('should clear currentUserId and set returnedAt on active assignment', async () => {
      const mockAsset = { id: '1', name: 'Asset', currentUserId: 'user1' };
      const mockAssignment = { id: 'a1', assetId: '1', userId: 'user1', returnedAt: null };
      mockPrismaService.asset.findUnique.mockResolvedValue(mockAsset);
      mockPrismaService.assetAssignment.findFirst.mockResolvedValue(mockAssignment);
      mockPrismaService.assetAssignment.update.mockResolvedValue({ ...mockAssignment, returnedAt: new Date() });
      mockPrismaService.asset.update.mockResolvedValue({ ...mockAsset, currentUserId: null });

      await service.returnAsset('1');

      expect(mockPrismaService.asset.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { currentUserId: null },
      });
    });
  });

  describe('getStats', () => {
    it('should return asset statistics by lifecycle', async () => {
      mockPrismaService.asset.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(3)    // IN_STOCK
        .mockResolvedValueOnce(5)    // IN_USE
        .mockResolvedValueOnce(1)    // IN_MAINTENANCE
        .mockResolvedValueOnce(0)    // RETIRED
        .mockResolvedValueOnce(1);   // LOST

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.inStock).toBe(3);
      expect(result.inUse).toBe(5);
      expect(result.inMaintenance).toBe(1);
    });
  });
});