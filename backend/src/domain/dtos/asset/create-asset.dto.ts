import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Sector } from '@prisma/client';

export enum AssetCategoryDto {
  COMPUTER = 'COMPUTER',
  LAPTOP = 'LAPTOP',
  PRINTER = 'PRINTER',
  PHONE = 'PHONE',
  PERIPHERAL = 'PERIPHERAL',
  NETWORK_DEVICE = 'NETWORK_DEVICE',
  ELECTRICAL_TOOL = 'ELECTRICAL_TOOL',
  OTHER = 'OTHER',
}

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  tag: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AssetCategoryDto)
  category: AssetCategoryDto;

  @IsOptional()
  @IsEnum(AssetCategoryDto)
  status?: string;

  @IsEnum(Sector)
  sector: Sector;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyEndsAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateAssetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(AssetCategoryDto)
  @IsOptional()
  category?: AssetCategoryDto;

  @IsString()
  @IsOptional()
  status?: string;

  @IsEnum(Sector)
  @IsOptional()
  sector?: Sector;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyEndsAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  currentUserId?: string;
}

export class AssignAssetDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class QueryAssetDto {
  @IsEnum(Sector)
  @IsOptional()
  sector?: Sector;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}