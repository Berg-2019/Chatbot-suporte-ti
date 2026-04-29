import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { LicenseType } from '@prisma/client';

export class CreateLicenseDto {
  @IsString()
  software: string;

  @IsString()
  @IsOptional()
  vendor?: string;

  @IsString()
  @IsOptional()
  licenseKey?: string;

  @IsEnum(LicenseType)
  type: LicenseType;

  @IsNumber()
  @Min(1)
  @IsOptional()
  seats?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;
}

export class UpdateLicenseDto {
  @IsString()
  @IsOptional()
  software?: string;

  @IsString()
  @IsOptional()
  vendor?: string;

  @IsString()
  @IsOptional()
  licenseKey?: string;

  @IsEnum(LicenseType)
  @IsOptional()
  type?: LicenseType;

  @IsNumber()
  @Min(1)
  @IsOptional()
  seats?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;
}

export class AssignLicenseDto {
  @IsString()
  assetId?: string;

  @IsString()
  userId?: string;
}
