/**
 * Licenses Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LicensesService } from './licenses.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LicenseType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
        { id: '1', software: 'Office 365', type: 'SUBSCRIPTION' as LicenseType },
        { id: '2', software: 'Adobe CC', type: 'SUBSCRIPTION' as LicenseType },
      ];
      mockPrismaService.license.findMany.mockResolvedValue(mockLicenses);
      mockPrismaService.license.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(mockPrismaService.license.findMany).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      mockPrismaService.license.findMany.mockResolvedValue([]);
      mockPrismaService.license.count.mockResolvedValue(0);

      await service.findAll({ search: 'Office' });

      expect(mockPrismaService.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { software: { contains: 'Office', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter expired licenses', async () => {
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
  });

  describe('create', () => {
    it('should create a license with defaults', async () => {
      const dto = { software: 'Office 365', vendor: 'Microsoft', type: 'SUBSCRIPTION' as LicenseType };
      const created = { id: '1', ...dto, seats: 1, expiresAt: null, cost: null };
      mockPrismaService.license.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockPrismaService.license.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          software: 'Office 365',
          type: 'SUBSCRIPTION',
          seats: 1,
        }),
      });
      expect(result.seats).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when license not found', async () => {
      mockPrismaService.license.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return license with assignments', async () => {
      const mockLicense = {
        id: '1',
        software: 'Office 365',
        assignments: [{ id: 'a1', licenseId: '1' }],
      };
      mockPrismaService.license.findUnique.mockResolvedValue(mockLicense);

      const result = await service.findOne('1');

      expect(result.software).toBe('Office 365');
    });
  });

  describe('assign', () => {
    it('should throw BadRequestException when neither assetId nor userId provided', async () => {
      const mockLicense = { id: '1', seats: 5, assignments: [] };
      mockPrismaService.license.findUnique.mockResolvedValue(mockLicense);

      await expect(service.assign('1', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when seats exhausted', async () => {
      const mockLicense = { id: '1', seats: 1, assignments: [{ id: 'a1' }] };
      mockPrismaService.license.findUnique.mockResolvedValue(mockLicense);
      mockPrismaService.licenseAssignment.count.mockResolvedValue(1);

      await expect(service.assign('1', { userId: 'user1' })).rejects.toThrow(BadRequestException);
    });

    it('should create assignment when seats available', async () => {
      const mockLicense = { id: '1', seats: 5, assignments: [] };
      mockPrismaService.license.findUnique.mockResolvedValue(mockLicense);
      mockPrismaService.licenseAssignment.count.mockResolvedValue(0);
      mockPrismaService.licenseAssignment.create.mockResolvedValue({ id: 'a1' });

      const result = await service.assign('1', { userId: 'user1' });

      expect(mockPrismaService.licenseAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          licenseId: '1',
          userId: 'user1',
        }),
      });
    });
  });

  describe('unassign', () => {
    it('should throw NotFoundException when assignment not found', async () => {
      mockPrismaService.licenseAssignment.findUnique.mockResolvedValue(null);

      await expect(service.unassign('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should set returnedAt on assignment', async () => {
      const mockAssignment = { id: 'a1', licenseId: '1', userId: 'user1', returnedAt: null };
      mockPrismaService.licenseAssignment.findUnique.mockResolvedValue(mockAssignment);
      mockPrismaService.licenseAssignment.update.mockResolvedValue({ ...mockAssignment, returnedAt: new Date() });

      await service.unassign('a1');

      expect(mockPrismaService.licenseAssignment.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { returnedAt: expect.any(Date) },
      });
    });
  });

  describe('getStats', () => {
    it('should return license statistics', async () => {
      mockPrismaService.license.count.mockResolvedValueOnce(10);
      mockPrismaService.license.count.mockResolvedValueOnce(2);
      mockPrismaService.license.count.mockResolvedValueOnce(8);
      mockPrismaService.licenseAssignment.count.mockResolvedValueOnce(5);

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.expired).toBe(2);
      expect(result.active).toBe(8);
      expect(result.totalAssignments).toBe(5);
    });
  });
});