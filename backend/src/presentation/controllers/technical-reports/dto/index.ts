import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Sector,
  TechnicalReportStatus,
  SignerRole,
} from '@prisma/client';

export class CreateTechnicalReportDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200)
  site: string;

  @IsDateString()
  serviceDate: string;

  @IsOptional()
  @IsString()
  engineerId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  assistants?: string[];

  @IsString()
  @MaxLength(8000)
  summary: string;

  @IsString()
  @MaxLength(8000)
  execution: string;

  @IsString()
  @MaxLength(8000)
  materials: string;

  @IsString()
  @MaxLength(8000)
  observations: string;

  @IsOptional()
  @IsString()
  ticketId?: string;
}

export class UpdateTechnicalReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  site?: string;

  @IsOptional()
  @IsDateString()
  serviceDate?: string;

  @IsOptional()
  @IsString()
  engineerId?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  assistants?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  execution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  materials?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  observations?: string;

  @IsOptional()
  @IsString()
  ticketId?: string;
}

export class QueryTechnicalReportDto {
  @IsOptional()
  @IsEnum(TechnicalReportStatus)
  status?: TechnicalReportStatus;

  @IsOptional()
  @IsEnum(Sector)
  sector?: Sector;

  @IsOptional()
  @IsDateString()
  serviceDateFrom?: string;

  @IsOptional()
  @IsDateString()
  serviceDateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateStatusDto {
  @IsEnum(TechnicalReportStatus)
  status: TechnicalReportStatus;
}

export class CreateAnnotationDto {
  @IsEnum(SignerRole)
  authorRole: SignerRole;

  @IsString()
  @MaxLength(64)
  field: string;

  @IsString()
  @MaxLength(2000)
  comment: string;
}

export class SignTechnicalReportDto {
  @IsEnum(SignerRole)
  role: SignerRole;

  @IsString()
  @MaxLength(120)
  signerName: string;
}
