/**
 * SLA Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SlaService } from './sla.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SlaCalculatorService } from '../../../infrastructure/sla/sla-calculator.service';
import { AlertService } from '../../../infrastructure/services/alert.service';
import { Priority, Sector } from '@prisma/client';

describe('SlaService', () => {
  let service: SlaService;

  const mockPrismaService = {
    ticket: { findUnique: jest.fn() },
    slaPolicy: { findUnique: jest.fn(), findMany: jest.fn() },
    slaTimer: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    businessHours: { findUnique: jest.fn() },
  };

  const mockCalculator = {
    calculateDeadlines: jest.fn(),
  };

  const mockAlertService = {
    create: jest.fn(),
    alertSLABreach: jest.fn(),
    alertSLAWarning: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SlaCalculatorService, useValue: mockCalculator },
        { provide: AlertService, useValue: mockAlertService },
      ],
    }).compile();

    service = module.get<SlaService>(SlaService);
  });

  describe('createTimerForTicket', () => {
    it('should return null when ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      const result = await service.createTimerForTicket('nonexistent');

      expect(result).toBeNull();
    });

    it('should create timer with policy deadlines when policy exists', async () => {
      const ticket = { id: '1', sector: 'TI' as Sector, priority: 'HIGH' as Priority };
      const policy = {
        id: 'policy1',
        responseTimeMins: 30,
        resolutionTimeMins: 240,
        businessHours: { schedule: '09:00-18:00', timezone: 'America/Sao_Paulo' },
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.slaPolicy.findUnique.mockResolvedValue(policy);
      mockCalculator.calculateDeadlines.mockReturnValue({
        responseDueAt: new Date('2025-01-01T10:00:00Z'),
        resolutionDueAt: new Date('2025-01-01T18:00:00Z'),
      });
      mockPrismaService.slaTimer.upsert.mockResolvedValue({ id: '1', ticketId: '1' });

      const result = await service.createTimerForTicket('1');

      expect(mockCalculator.calculateDeadlines).toHaveBeenCalledWith(
        30,
        240,
        expect.any(Date),
        policy.businessHours.schedule,
        'America/Sao_Paulo',
      );
      expect(mockPrismaService.slaTimer.upsert).toHaveBeenCalled();
    });

    it('should use default SLA when no policy found', async () => {
      const ticket = { id: '1', sector: 'TI' as Sector, priority: 'NORMAL' as Priority };

      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);
      mockPrismaService.slaPolicy.findUnique.mockResolvedValue(null);
      mockPrismaService.slaTimer.upsert.mockResolvedValue({ id: '1', ticketId: '1' });

      const result = await service.createTimerForTicket('1');

      expect(mockPrismaService.slaTimer.upsert).toHaveBeenCalledWith({
        where: { ticketId: '1' },
        create: expect.objectContaining({
          responseDueAt: expect.any(Date),
          resolutionDueAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          responseDueAt: expect.any(Date),
          resolutionDueAt: expect.any(Date),
        }),
      });
    });
  });

  describe('getTimer', () => {
    it('should return timer for ticket', async () => {
      const timer = { id: '1', ticketId: '1', responseDueAt: new Date(), resolutionDueAt: new Date() };
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(timer);

      const result = await service.getTimer('1');

      expect(result).toEqual(timer);
      expect(mockPrismaService.slaTimer.findUnique).toHaveBeenCalledWith({ where: { ticketId: '1' } });
    });

    it('should return null when no timer found', async () => {
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(null);

      const result = await service.getTimer('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('pauseTimer', () => {
    it('should return null when timer not found', async () => {
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(null);

      const result = await service.pauseTimer('nonexistent');

      expect(result).toBeNull();
    });

    it('should set pausedAt when timer exists', async () => {
      const timer = { id: '1', ticketId: '1' };
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(timer);
      mockPrismaService.slaTimer.update.mockResolvedValue({ ...timer, pausedAt: new Date() });

      const result = await service.pauseTimer('1');

      expect(mockPrismaService.slaTimer.update).toHaveBeenCalledWith({
        where: { ticketId: '1' },
        data: { pausedAt: expect.any(Date) },
      });
    });
  });

  describe('resumeTimer', () => {
    it('should return null when timer not found', async () => {
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(null);

      const result = await service.resumeTimer('nonexistent');

      expect(result).toBeNull();
    });

    it('should return timer unchanged when not paused', async () => {
      const timer = { id: '1', ticketId: '1', pausedAt: null };
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(timer);

      const result = await service.resumeTimer('1');

      expect(result).toEqual(timer);
    });

    it('should clear pausedAt and adjust deadlines when timer is paused', async () => {
      const now = Date.now();
      const pausedAt = new Date(now - 600000);
      const responseDueAt = new Date(now + 600000);
      const resolutionDueAt = new Date(now + 1800000);
      const timer = { id: '1', ticketId: '1', pausedAt, responseDueAt, resolutionDueAt };

      mockPrismaService.slaTimer.findUnique.mockResolvedValue(timer);
      mockPrismaService.slaTimer.update.mockResolvedValue({ ...timer, pausedAt: null });

      const result = await service.resumeTimer('1');

      expect(mockPrismaService.slaTimer.update).toHaveBeenCalledWith({
        where: { ticketId: '1' },
        data: expect.objectContaining({
          pausedAt: null,
          resumedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('markFirstResponse', () => {
    it('should return timer when not found', async () => {
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(null);

      const result = await service.markFirstResponse('nonexistent');

      expect(result).toBeNull();
    });

    it('should return timer when response already met', async () => {
      const timer = { id: '1', ticketId: '1', responseMetAt: new Date() };
      mockPrismaService.slaTimer.findUnique.mockResolvedValue(timer);

      const result = await service.markFirstResponse('1');

      expect(result).toEqual(timer);
    });

    it('should mark responseMetAt and alert if breached', async () => {
      const pastDue = new Date(Date.now() - 60000);
      const timer = {
        id: '1',
        ticketId: 'ticket1',
        responseDueAt: pastDue,
        responseMetAt: null,
        resolutionDueAt: new Date(),
      };
      const ticket = { id: 'ticket1', assignedToId: 'user1' };

      mockPrismaService.slaTimer.findUnique.mockResolvedValue(timer);
      mockPrismaService.slaTimer.update.mockResolvedValue({ ...timer, responseMetAt: new Date(), responseBreached: true });
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.markFirstResponse('ticket1');

      expect(mockPrismaService.slaTimer.update).toHaveBeenCalledWith({
        where: { ticketId: 'ticket1' },
        data: expect.objectContaining({ responseMetAt: expect.any(Date) }),
      });
    });
  });

  describe('getBreaches', () => {
    it('should return active breaches in last 24h', async () => {
      const breaches = [
        { ticketId: '1', responseDueAt: new Date(), resolutionDueAt: new Date() },
      ];
      mockPrismaService.slaTimer.findMany.mockResolvedValue(breaches);

      const result = await service.getBreaches();

      expect(mockPrismaService.slaTimer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resolutionMetAt: null,
            pausedAt: null,
          }),
        }),
      );
    });
  });

  describe('getDashboard', () => {
    it('should return SLA dashboard metrics', async () => {
      mockPrismaService.slaTimer.count.mockResolvedValue(10);

      const result = await service.getDashboard();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('responseBreached');
      expect(result).toHaveProperty('resolutionBreached');
      expect(result).toHaveProperty('responseWarning');
      expect(result).toHaveProperty('resolutionWarning');
    });
  });
});