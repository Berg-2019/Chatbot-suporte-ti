/**
 * DTOs for Contacts
 */

import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpsertContactDto {
  @IsString()
  jid: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  name: string;

  @IsString()
  sector: string;

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

  @IsString()
  sector: string;

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

  @IsOptional()
  @IsString()
  sector?: string;

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
