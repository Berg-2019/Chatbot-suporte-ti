/**
 * SLA Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SlaService } from './sla.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SlaCalculatorService } from '../../../infrastructure/sla/sla-calculator.service';
import { AlertService } from '../../../infrastructure/services/alert.service';
import { Sector, Priority } from '@prisma/client';

describe('SlaService', () => {
  let service: SlaService;

  const mockPrismaService = {
    ticket: { findUnique: jest.fn() },
    slaPolicy: { findUnique: jest.fn() },
    slaTimer: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };

  const mockSlaCalculator = {
    calculateDeadlines: jest.fn(),
  };

  const mockAlertService = {
    sendBreachWarning: jest.fn(),
    sendBreachNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SlaCalculatorService, useValue: mockSlaCalculator },
        { provide: AlertService, useValue: mockAlertService },
      ],
    }).compile();

    service = module.get<SlaService>(SlaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTimerForTicket', () => {
    it('should return null when ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      const result = await service.createTimerForTicket('nonexistent');

      expect(result).toBeNull();
    });

    it('should create timer with default deadlines when no policy found', async () => {
      const mockTicket = { id: '1', sector: 'TI', priority: 'NORMAL' };
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.slaPolicy.findUnique.mockResolvedValue(null);
      const mockTimer = { id: '1', ticketId: '1', responseDueAt: new Date(), resolutionDueAt: new Date() };
      mockPrismaService.slaTimer.upsert.mockResolvedValue(mockTimer);

      const result = await service.createTimerForTicket('1');

      expect(mockPrismaService.slaTimer.upsert).toHaveBeenCalledWith({
        where: { ticketId: '1' },
        create: expect.objectContaining({
          ticketId: '1',
          policyId: undefined,
        }),
        update: expect.any(Object),
      });
    });

    it('should use policy deadlines when policy exists', async () => {
      const mockTicket = { id: '1', sector: 'TI' as Sector, priority: 'HIGH' as Priority };
      const mockPolicy = {
        id: 'policy1',
        sector: 'TI' as Sector,
        priority: 'HIGH' as Priority,
        responseTimeMins: 30,
        resolutionTimeMins: 240,
        businessHours: null,
      };
      const responseDue = new Date(Date.now() + 30 * 60000);
      const resolutionDue = new Date(Date.now() + 240 * 60000);

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.slaPolicy.findUnique.mockResolvedValue(mockPolicy);
      mockSlaCalculator.calculateDeadlines.mockReturnValue({
        responseDueAt: responseDue,
        resolutionDueAt: resolutionDue,
      });
      mockPrismaService.slaTimer.upsert.mockResolvedValue({
        id: '1', ticketId: '1', responseDueAt: responseDue, resolutionDueAt: resolutionDue,
      });

      await service.createTimerForTicket('1');

      expect(mockSlaCalculator.calculateDeadlines).toHaveBeenCalledWith(
        30,
        240,
        expect.any(Date),
        undefined,
        'America/Sao_Paulo',
      );
    });
  });

  describe('pauseTimer', () => {
    it('should return null when timer not found', async () => {
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(null);

      const result = await service.pauseTimer('nonexistent');

      expect(result).toBeNull();
    });

    it('should set pausedAt on timer', async () => {
      const mockTimer = { id: '1', ticketId: '1', pausedAt: null };
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.slaTimer.update.mockResolvedValue({ ...mockTimer, pausedAt: new Date() });

      await service.pauseTimer('1');

      expect(mockPrismaService.slaTimer.update).toHaveBeenCalledWith({
        where: { ticketId: '1' },
        data: { pausedAt: expect.any(Date) },
      });
    });
  });

  describe('resumeTimer', () => {
    it('should clear pausedAt on timer', async () => {
      const mockTimer = { id: '1', ticketId: '1', pausedAt: new Date() };
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(mockTimer);
      mockPrismaService.slaTimer.update.mockResolvedValue({ ...mockTimer, pausedAt: null });

      await service.resumeTimer('1');

      expect(mockPrismaService.slaTimer.update).toHaveBeenCalledWith({
        where: { ticketId: '1' },
        data: { pausedAt: null },
      });
    });
  });
});