import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { AssetCategory, AssetLifecycle, Sector } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  tag: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  name: string;

  @IsEnum(AssetCategory)
  category: AssetCategory;

  @IsEnum(AssetLifecycle)
  @IsOptional()
  status?: AssetLifecycle;

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

  @IsEnum(AssetCategory)
  @IsOptional()
  category?: AssetCategory;

  @IsEnum(AssetLifecycle)
  @IsOptional()
  status?: AssetLifecycle;

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
}

export class AssignAssetDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReturnAssetDto {}