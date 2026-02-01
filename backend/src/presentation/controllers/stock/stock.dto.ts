/**
 * Stock DTOs - Data Transfer Objects
 */

import {
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsBoolean,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums matching Prisma schema
export enum StockType {
    TI = 'TI',
    ELECTRIC = 'ELECTRIC',
}

export enum ItemCategory {
    SUPPLY = 'SUPPLY',
    INK = 'INK',
    ASSET = 'ASSET',
}

export enum UnitOfMeasure {
    UN = 'UN',
    M = 'M',
    L = 'L',
    ML = 'ML',
    CX = 'CX',
    PCT = 'PCT',
    KG = 'KG',
}

export enum InkColor {
    BLACK = 'BLACK',
    CYAN = 'CYAN',
    MAGENTA = 'MAGENTA',
    YELLOW = 'YELLOW',
}

export enum AssetStatus {
    AVAILABLE = 'AVAILABLE',
    RESERVED = 'RESERVED',
    IN_USE = 'IN_USE',
    MAINTENANCE = 'MAINTENANCE',
}

// Create DTO
export class CreateStockItemDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsEnum(StockType)
    stockType: StockType;

    @IsEnum(ItemCategory)
    category: ItemCategory;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    quantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minQuantity?: number;

    @IsEnum(UnitOfMeasure)
    unit: UnitOfMeasure;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    unitCost?: number;

    @IsOptional()
    @IsString()
    location?: string;

    // Ink specific
    @IsOptional()
    @IsString()
    printerModel?: string;

    @IsOptional()
    @IsEnum(InkColor)
    inkColor?: InkColor;

    // Asset specific
    @IsOptional()
    @IsString()
    assetTag?: string;

    @IsOptional()
    @IsEnum(AssetStatus)
    assetStatus?: AssetStatus;
}

// Update DTO
export class UpdateStockItemDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    quantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minQuantity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    unitCost?: number;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    printerModel?: string;

    @IsOptional()
    @IsEnum(InkColor)
    inkColor?: InkColor;

    @IsOptional()
    @IsString()
    assetTag?: string;

    @IsOptional()
    @IsEnum(AssetStatus)
    assetStatus?: AssetStatus;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

// Query DTO
export class StockQueryDto {
    @IsOptional()
    @IsEnum(StockType)
    stockType?: StockType;

    @IsOptional()
    @IsEnum(ItemCategory)
    category?: ItemCategory;

    @IsOptional()
    @IsEnum(AssetStatus)
    assetStatus?: AssetStatus;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    lowStock?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

// Movement DTO (entrada/saída)
export class StockMovementDto {
    @Type(() => Number)
    @IsNumber()
    quantity: number; // Positive = entrada, Negative = saída

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    ticketId?: string;
}
