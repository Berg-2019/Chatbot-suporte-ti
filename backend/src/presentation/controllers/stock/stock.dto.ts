import {
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsBoolean,
    Min,
    Max,
    IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

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
    isReservable?: boolean;
}

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
    isReservable?: boolean;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

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
    @IsBoolean()
    @Type(() => Boolean)
    reservable?: boolean;

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

export class StockMovementDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsUUID()
    ticketId?: string;
}

export class StockEntryDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsUUID()
    supplierId?: string;

    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    cost?: number;
}

export class StockExitDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsUUID()
    ticketId?: string;

    @IsOptional()
    @IsUUID()
    technicianId?: string;

    @IsOptional()
    @IsString()
    destination?: string;
}

export class MovementQueryDto {
    @IsOptional()
    @IsString()
    type?: 'IN' | 'OUT';

    @IsOptional()
    @IsUUID()
    stockItemId?: string;

    @IsOptional()
    @IsString()
    performedBy?: string;

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
