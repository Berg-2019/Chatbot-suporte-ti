/**
 * DTOs for Contacts
 */

import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { Sector } from '@prisma/client';

export class UpsertContactDto {
  @IsString()
  jid: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  name: string;

  @IsEnum(Sector)
  sector: Sector;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  ramal?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsObject()
  customAttributes?: any;
}

export class CreateContactDto {
  @IsString()
  jid: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  name: string;

  @IsEnum(Sector)
  sector: Sector;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  ramal?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsObject()
  customAttributes?: any;
}

export class BlockContactDto {
  @IsString()
  blockedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DetectSpamDto {
  @IsString()
  message: string;
}

export class IncrementSpamScoreDto {
  @IsOptional()
  points?: number;
}

export class UpdateProfilePictureDto {
  @IsOptional()
  profilePicUrl?: string | null;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(Sector)
  @IsOptional()
  sector?: Sector;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  ramal?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsObject()
  customAttributes?: any;
}
