/**
 * Reservation Service - Business Logic for Asset Scheduling
 */

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
    CreateReservationDto,
    UpdateReservationStatusDto,
    ReservationQueryDto,
} from './reservation.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReservationService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lista reservas com filtros
     */
    async findAll(query: ReservationQueryDto) {
        const where: Prisma.ReservationWhereInput = {};

        if (query.stockItemId) {
            where.stockItemId = query.stockItemId;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.startDate || query.endDate) {
            where.startTime = {};
            if (query.startDate) {
                where.startTime.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.startTime.lte = new Date(query.endDate);
            }
        }

        return this.prisma.reservation.findMany({
            where,
            include: {
                stockItem: {
                    select: {
                        id: true,
                        name: true,
                        assetTag: true,
                        category: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });
    }

    /**
     * Busca uma reserva por ID
     */
    async findOne(id: string) {
        const reservation = await this.prisma.reservation.findUnique({
            where: { id },
            include: {
                stockItem: true,
            },
        });

        if (!reservation) {
            throw new NotFoundException(`Reserva ${id} não encontrada`);
        }

        return reservation;
    }

    /**
     * Cria uma nova reserva
     */
    async create(dto: CreateReservationDto) {
        // Verificar se o item existe e é um ASSET
        const stockItem = await this.prisma.stockItem.findUnique({
            where: { id: dto.stockItemId },
        });

        if (!stockItem) {
            throw new NotFoundException(`Item ${dto.stockItemId} não encontrado`);
        }

        if (stockItem.category !== 'ASSET') {
            throw new BadRequestException('Apenas itens do tipo PATRIMÔNIO podem ser reservados');
        }

        // Verificar conflito de horários
        const startTime = new Date(dto.startTime);
        const endTime = new Date(dto.endTime);

        if (startTime >= endTime) {
            throw new BadRequestException('Data de início deve ser anterior à data de fim');
        }

        const conflict = await this.prisma.reservation.findFirst({
            where: {
                stockItemId: dto.stockItemId,
                status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
                OR: [
                    {
                        startTime: { lte: startTime },
                        endTime: { gt: startTime },
                    },
                    {
                        startTime: { lt: endTime },
                        endTime: { gte: endTime },
                    },
                    {
                        startTime: { gte: startTime },
                        endTime: { lte: endTime },
                    },
                ],
            },
        });

        if (conflict) {
            throw new ConflictException('Já existe uma reserva para este período');
        }

        return this.prisma.reservation.create({
            data: {
                stockItemId: dto.stockItemId,
                userId: dto.userId,
                userName: dto.userName,
                userPhone: dto.userPhone,
                userSector: dto.userSector,
                startTime,
                endTime,
                notes: dto.notes,
                ticketId: dto.ticketId,
                status: 'PENDING',
            },
            include: {
                stockItem: {
                    select: {
                        id: true,
                        name: true,
                        assetTag: true,
                    },
                },
            },
        });
    }

    /**
     * Atualiza status de uma reserva (aprovar, rejeitar, etc)
     */
    async updateStatus(id: string, dto: UpdateReservationStatusDto, approvedById?: string) {
        const reservation = await this.findOne(id);

        // Validar transições de status
        const validTransitions: Record<string, string[]> = {
            PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
            APPROVED: ['IN_USE', 'CANCELLED'],
            IN_USE: ['COMPLETED'],
            REJECTED: [],
            COMPLETED: [],
            CANCELLED: [],
        };

        if (!validTransitions[reservation.status]?.includes(dto.status)) {
            throw new BadRequestException(
                `Não é possível mudar de ${reservation.status} para ${dto.status}`,
            );
        }

        // Usar transação para evitar race conditions
        return this.prisma.$transaction(async (tx) => {
            // Atualizar status do asset se necessário
            if (dto.status === 'IN_USE') {
                await tx.stockItem.update({
                    where: { id: reservation.stockItemId },
                    data: { assetStatus: 'IN_USE' },
                });
            } else if (dto.status === 'COMPLETED' || dto.status === 'CANCELLED') {
                await tx.stockItem.update({
                    where: { id: reservation.stockItemId },
                    data: { assetStatus: 'AVAILABLE' },
                });
            }

            // Atualizar reserva
            return tx.reservation.update({
                where: { id },
                data: {
                    status: dto.status,
                    notes: dto.notes || reservation.notes,
                    approvedById: dto.status === 'APPROVED' ? approvedById : reservation.approvedById,
                    updatedAt: new Date(),
                },
                include: {
                    stockItem: {
                        select: {
                            id: true,
                            name: true,
                            assetTag: true,
                        },
                    },
                },
            });
        });
    }

    /**
     * Reservas pendentes de aprovação
     */
    async getPendingCount() {
        return this.prisma.reservation.count({
            where: { status: 'PENDING' },
        });
    }

    /**
     * Timeline para um período (usado no cronograma)
     */
    async getTimeline(startDate: Date, endDate: Date) {
        return this.prisma.reservation.findMany({
            where: {
                status: { in: ['PENDING', 'APPROVED', 'IN_USE'] },
                OR: [
                    {
                        startTime: { gte: startDate, lte: endDate },
                    },
                    {
                        endTime: { gte: startDate, lte: endDate },
                    },
                ],
            },
            include: {
                stockItem: {
                    select: {
                        id: true,
                        name: true,
                        assetTag: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });
    }
}
