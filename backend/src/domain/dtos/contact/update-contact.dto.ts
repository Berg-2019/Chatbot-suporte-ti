import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';

export class UpdateContactDto {
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  ramal?: string;

  @IsObject()
  @IsOptional()
  customAttributes?: Record<string, any>;
}
