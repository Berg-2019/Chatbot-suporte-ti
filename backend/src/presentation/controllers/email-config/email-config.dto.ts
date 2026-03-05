/**
 * Email Config DTOs with Validation
 */

import { IsString, IsInt, IsBoolean, IsOptional, Min, Max, IsEmail } from 'class-validator';

export class CreateEmailConfigDto {
  @IsString()
  imapHost: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort: number;

  @IsEmail()
  imapUser: string;

  @IsString()
  imapPassword: string;

  @IsOptional()
  @IsBoolean()
  imapTls?: boolean;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsOptional()
  @IsEmail()
  smtpUser?: string;

  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @IsOptional()
  @IsBoolean()
  smtpTls?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(10) // Minimum 10 seconds
  @Max(3600) // Maximum 1 hour
  pollInterval?: number;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @IsOptional()
  @IsString()
  defaultPriority?: string;

  @IsOptional()
  @IsString()
  defaultSector?: string;
}

export class UpdateEmailConfigDto {
  @IsOptional()
  @IsString()
  imapHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort?: number;

  @IsOptional()
  @IsEmail()
  imapUser?: string;

  @IsOptional()
  @IsString()
  imapPassword?: string;

  @IsOptional()
  @IsBoolean()
  imapTls?: boolean;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsOptional()
  @IsEmail()
  smtpUser?: string;

  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @IsOptional()
  @IsBoolean()
  smtpTls?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  pollInterval?: number;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @IsOptional()
  @IsString()
  defaultPriority?: string;

  @IsOptional()
  @IsString()
  defaultSector?: string;
}
