/**
 * PurchaseRequests Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { PushService } from '../push/push.service';
import { Sector } from '@prisma/client';
import { PurchaseRequestStatus } from './purchase-requests.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PurchaseRequestsService', () => {
  let service: PurchaseRequestsService;

  const mockPrismaService = {
    purchaseRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRabbitMQService = {
    publishNotification: jest.fn(),
    publishPurchaseRequestEvent: jest.fn(),
    publishOutgoingMessage: jest.fn(),
  };

  const mockPushService = {
    sendToUser: jest.fn().mockResolvedValue({ sent: 0 }),
    sendToRole: jest.fn().mockResolvedValue({ sent: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequestsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RabbitMQService, useValue: mockRabbitMQService },
        { provide: PushService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get<PurchaseRequestsService>(PurchaseRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a purchase request with PENDING status', async () => {
      const dto = {
        title: 'Notebook Dell',
        description: 'Para novo сотрудник',
        quantity: 1,
        justification: 'Reposição',
        sector: 'TI' as Sector,
        requesterName: 'João Silva',
        requesterPhone: '11999999999',
      };
      const created = { id: '1', ...dto, status: PurchaseRequestStatus.PENDING };
      mockPrismaService.purchaseRequest.create.mockResolvedValue(created);

      const result = await service.create(dto, 'user1');

      expect(mockPrismaService.purchaseRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Notebook Dell',
          status: PurchaseRequestStatus.PENDING,
        }),
      });
      expect(result.status).toBe(PurchaseRequestStatus.PENDING);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockItems = [
        { id: '1', title: 'Item 1', status: PurchaseRequestStatus.PENDING },
        { id: '2', title: 'Item 2', status: PurchaseRequestStatus.PENDING },
      ];
      mockPrismaService.purchaseRequest.findMany.mockResolvedValue(mockItems);
      mockPrismaService.purchaseRequest.count.mockResolvedValue(2);

      const result = await service.findAll({}, 'ADMIN_COMPRAS', 'TI');

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('ADMIN_COMPRAS should see all sectors', async () => {
      mockPrismaService.purchaseRequest.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseRequest.count.mockResolvedValue(0);

      await service.findAll({}, 'ADMIN_COMPRAS', undefined);

      expect(mockPrismaService.purchaseRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ sector: expect.anything() }),
        }),
      );
    });

    it('non-ADMIN_COMPRAS should filter by own sector', async () => {
      mockPrismaService.purchaseRequest.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseRequest.count.mockResolvedValue(0);

      await service.findAll({}, 'AGENT', 'ELECTRIC' as Sector);

      expect(mockPrismaService.purchaseRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sector: 'ELECTRIC' }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.purchaseRequest.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseRequest.count.mockResolvedValue(0);

      await service.findAll({ status: PurchaseRequestStatus.APPROVED }, 'ADMIN_COMPRAS', undefined);

      expect(mockPrismaService.purchaseRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PurchaseRequestStatus.APPROVED }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return purchase request when found', async () => {
      const mockPR = { id: '1', title: 'Item', status: PurchaseRequestStatus.PENDING };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);

      const result = await service.findById('1');

      expect(result.title).toBe('Item');
    });
  });

  describe('approve', () => {
    it('should throw BadRequestException when not PENDING', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.APPROVED };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);

      await expect(service.approve('1', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should update status to APPROVED and set approvedById', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.PENDING };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);
      mockPrismaService.purchaseRequest.update.mockResolvedValue({ ...mockPR, status: PurchaseRequestStatus.APPROVED, approvedById: 'admin1' });

      const result = await service.approve('1', 'admin1');

      expect(mockPrismaService.purchaseRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: PurchaseRequestStatus.APPROVED,
          approvedById: 'admin1',
        }),
      });
    });
  });

  describe('reject', () => {
    it('should throw BadRequestException when not PENDING', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.APPROVED };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);

      await expect(service.reject('1', 'admin1', 'Fora do orçamento')).rejects.toThrow(BadRequestException);
    });

    it('should update status to REJECTED with reason', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.PENDING };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);
      mockPrismaService.purchaseRequest.update.mockResolvedValue({ ...mockPR, status: PurchaseRequestStatus.REJECTED });

      const result = await service.reject('1', 'admin1', 'Fora do orçamento');

      expect(mockPrismaService.purchaseRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: PurchaseRequestStatus.REJECTED,
          rejectionReason: 'Fora do orçamento',
        }),
      });
    });
  });

  describe('markPurchased', () => {
    it('should throw BadRequestException when not APPROVED', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.PENDING };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);

      await expect(service.markPurchased('1', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should update status to PURCHASED and set purchasedById', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.APPROVED };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);
      mockPrismaService.purchaseRequest.update.mockResolvedValue({ ...mockPR, status: PurchaseRequestStatus.PURCHASED, purchasedById: 'admin1' });

      const result = await service.markPurchased('1', 'admin1');

      expect(mockPrismaService.purchaseRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: PurchaseRequestStatus.PURCHASED,
          purchasedById: 'admin1',
        }),
      });
    });
  });

  describe('markDelivered', () => {
    it('should throw BadRequestException when not PURCHASED', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.APPROVED };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);

      await expect(service.markDelivered('1', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should update status to DELIVERED and set deliveredById', async () => {
      const mockPR = { id: '1', status: PurchaseRequestStatus.PURCHASED };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue(mockPR);
      mockPrismaService.purchaseRequest.update.mockResolvedValue({ ...mockPR, status: PurchaseRequestStatus.DELIVERED, deliveredById: 'admin1' });

      const result = await service.markDelivered('1', 'admin1');

      expect(mockPrismaService.purchaseRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: PurchaseRequestStatus.DELIVERED,
          deliveredById: 'admin1',
        }),
      });
    });
  });
});