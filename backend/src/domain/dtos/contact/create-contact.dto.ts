import { IsString, IsNotEmpty, IsOptional, IsEmail, IsObject } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsOptional()
  jid?: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  name: string;

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
