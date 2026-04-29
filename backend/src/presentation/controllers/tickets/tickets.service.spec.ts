/**
 * Tickets Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RabbitMQService } from '../../../infrastructure/messaging/rabbitmq.service';
import { AutomationEngineService } from '../../../infrastructure/services/automation-engine.service';
import { SlaService } from '../sla/sla.service';
import { Sector } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRabbitMQService = {
    publishCreateTicket: jest.fn(),
    publishNotification: jest.fn(),
  };

  const mockAutomationEngine = {
    processEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockSlaService = {
    createTimerForTicket: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RabbitMQService, useValue: mockRabbitMQService },
        { provide: AutomationEngineService, useValue: mockAutomationEngine },
        { provide: SlaService, useValue: mockSlaService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should filter by sector for non-admin users', async () => {
      const mockTickets = [
        { id: '1', title: 'Ticket 1', sector: 'TI' as Sector, status: 'NEW' },
        { id: '2', title: 'Ticket 2', sector: 'ELECTRIC' as Sector, status: 'NEW' },
      ];

      mockPrismaService.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrismaService.ticket.count.mockResolvedValue(2);

      const result = await service.findAll({
        sector: 'TI' as Sector,
        isAdmin: false,
      });

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sector: 'TI',
          }),
        }),
      );
    });

    it('should NOT filter by sector for admin users', async () => {
      const mockTickets = [
        { id: '1', title: 'Ticket 1', sector: 'TI' as Sector },
        { id: '2', title: 'Ticket 2', sector: 'ELECTRIC' as Sector },
      ];

      mockPrismaService.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrismaService.ticket.count.mockResolvedValue(2);

      const result = await service.findAll({
        sector: 'TI' as Sector,
        isAdmin: true,
      });

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            sector: expect.anything(),
          }),
        }),
      );
    });

    it('should apply status filter when provided', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.count.mockResolvedValue(0);

      await service.findAll({ status: 'NEW' });

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'NEW',
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a ticket with correct sector', async () => {
      const createDto = {
        title: 'New Ticket',
        description: 'Description',
        phoneNumber: '11999999999',
        sector: 'TI' as Sector,
        priority: 'NORMAL' as const,
      };

      const createdTicket = {
        id: '1',
        ...createDto,
        status: 'NEW',
        createdAt: new Date(),
      };

      mockPrismaService.ticket.create.mockResolvedValue(createdTicket);

      const result = await service.create(createDto);

      expect(mockPrismaService.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Ticket',
          sector: 'TI',
          status: 'NEW',
        }),
      });
      expect(result.sector).toBe('TI');
    });
  });
});
