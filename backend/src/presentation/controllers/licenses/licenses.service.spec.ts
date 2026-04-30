/**
 * Licenses Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LicensesService } from './licenses.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LicenseType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('LicensesService', () => {
  let service: LicensesService;

  const mockPrismaService = {
    license: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    licenseAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LicensesService>(LicensesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated licenses', async () => {
      const mockLicenses = [
        { id: '1', software: 'Microsoft 365', type: LicenseType.SUBSCRIPTION },
        { id: '2', software: 'Adobe CC', type: LicenseType.SUBSCRIPTION },
      ];

      mockPrismaService.license.findMany.mockResolvedValue(mockLicenses);
      mockPrismaService.license.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by type', async () => {
      mockPrismaService.license.findMany.mockResolvedValue([]);
      mockPrismaService.license.count.mockResolvedValue(0);

      await service.findAll({ type: LicenseType.SUBSCRIPTION });

      expect(mockPrismaService.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: LicenseType.SUBSCRIPTION }),
        }),
      );
    });

    it('should filter expired licenses (expired: true)', async () => {
      mockPrismaService.license.findMany.mockResolvedValue([]);
      mockPrismaService.license.count.mockResolvedValue(0);

      await service.findAll({ expired: true });

      expect(mockPrismaService.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should filter active licenses (expired: false)', async () => {
      mockPrismaService.license.findMany.mockResolvedValue([]);
      mockPrismaService.license.count.mockResolvedValue(0);

      await service.findAll({ expired: false });

      expect(mockPrismaService.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should search by software or vendor', async () => {
      mockPrismaService.license.findMany.mockResolvedValue([]);
      mockPrismaService.license.count.mockResolvedValue(0);

      await service.findAll({ search: 'Microsoft' });

      expect(mockPrismaService.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ software: expect.objectContaining({ contains: 'Microsoft' }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when license not found', async () => {
      mockPrismaService.license.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return license with assignments including asset info', async () => {
      const mockLicense = {
        id: '1',
        software: 'Microsoft 365',
        assignments: [
          {
            id: '1',
            asset: { id: '1', name: 'Notebook Dell', tag: 'PAT001' },
          },
        ],
      };
      mockPrismaService.license.findUnique.mockResolvedValue(mockLicense);

      const result = await service.findOne('1');

      expect(result.software).toBe('Microsoft 365');
      expect(result.assignments[0]?.asset?.tag).toBe('PAT001');
    });
  });

  describe('create', () => {
    it('should create license with required fields', async () => {
      const dto = {
        software: 'Adobe Photoshop',
        vendor: 'Adobe',
        licenseKey: 'APKS-1234-5678',
        type: LicenseType.SUBSCRIPTION,
        seats: 5,
      };

      const created = { id: '1', ...dto };
      mockPrismaService.license.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrismaService.license.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          software: 'Adobe Photoshop',
          type: LicenseType.SUBSCRIPTION,
        }),
      });
      expect(result.software).toBe('Adobe Photoshop');
    });

    it('should default seats to 1 when not provided', async () => {
      const dto = {
        software: 'Single App',
        type: LicenseType.PERPETUAL,
      };

      mockPrismaService.license.create.mockResolvedValue({ id: '1', ...dto, seats: 1 });

      await service.create(dto);

      expect(mockPrismaService.license.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ seats: 1 }),
      });
    });

    it('should parse expiresAt date string', async () => {
      const dto = {
        software: 'Trial App',
        type: LicenseType.SUBSCRIPTION,
        expiresAt: '2025-12-31',
      };

      mockPrismaService.license.create.mockResolvedValue({ id: '1', ...dto });

      await service.create(dto);

      expect(mockPrismaService.license.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('assign', () => {
    it('should create license assignment with assetId', async () => {
      const license = { id: '1', software: 'Office', seats: 10 };
      mockPrismaService.license.findUnique.mockResolvedValue(license);
      mockPrismaService.licenseAssignment.create.mockResolvedValue({ id: '1', licenseId: '1', assetId: 'asset1' });

      const result = await service.assign('1', { assetId: 'asset1' });

      expect(mockPrismaService.licenseAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          licenseId: '1',
          assetId: 'asset1',
        }),
      });
    });

    it('should throw NotFoundException when license not found', async () => {
      mockPrismaService.license.findUnique.mockResolvedValue(null);

      await expect(service.assign('nonexistent', { assetId: 'asset1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when neither assetId nor userId provided', async () => {
      const license = { id: '1', software: 'Office', seats: 10 };
      mockPrismaService.license.findUnique.mockResolvedValue(license);

      await expect(service.assign('1', {})).rejects.toThrow('Informe assetId ou userId');
    });
  });
});