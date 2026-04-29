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
