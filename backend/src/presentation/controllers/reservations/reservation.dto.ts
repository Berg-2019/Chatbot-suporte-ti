/**
 * Reservation DTOs - Data Transfer Objects
 */

import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
} from 'class-validator';

export enum ReservationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    IN_USE = 'IN_USE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

// Create DTO
export class CreateReservationDto {
    @IsString()
    stockItemId: string;

    @IsString()
    userName: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    userPhone?: string;

    @IsOptional()
    @IsString()
    userSector?: string;

    @IsDateString()
    startTime: string;

    @IsDateString()
    endTime: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    ticketId?: string;
}

// Update Status DTO
export class UpdateReservationStatusDto {
    @IsEnum(ReservationStatus)
    status: ReservationStatus;

    @IsOptional()
    @IsString()
    notes?: string;
}

// Query DTO
export class ReservationQueryDto {
    @IsOptional()
    @IsString()
    stockItemId?: string;

    @IsOptional()
    @IsEnum(ReservationStatus)
    status?: ReservationStatus;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
