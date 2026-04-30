import { IsString, IsOptional, IsNumber, IsPositive, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { Sector } from '@prisma/client';

export enum PurchaseRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  PURCHASED = 'PURCHASED',
  DELIVERED = 'DELIVERED',
}

export class CreatePurchaseRequestDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number = 1;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedValue?: number;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsEnum(Sector)
  sector: Sector;

  @IsString()
  requesterName: string;

  @IsOptional()
  @IsString()
  requesterPhone?: string;

  @IsOptional()
  @IsString()
  ticketId?: string;
}

export class QueryPurchaseRequestDto {
  @IsOptional()
  @IsEnum(Sector)
  sector?: Sector;

  @IsOptional()
  @IsEnum(PurchaseRequestStatus)
  status?: PurchaseRequestStatus;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;
}

export class ApprovePurchaseRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectPurchaseRequestDto {
  @IsString()
  rejectionReason: string;
}