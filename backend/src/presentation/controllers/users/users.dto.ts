import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsBrazilianPhone } from '../../../common/validators/phone.validator';

enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  STOCK_MANAGER = 'STOCK_MANAGER',
  VIEWER = 'VIEWER',
}

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'Login deve ter no mínimo 3 caracteres' })
  @MaxLength(50, { message: 'Login muito longo' })
  @Transform(({ value }) => value?.trim())
  login: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @MaxLength(100, { message: 'Senha muito longa' })
  password: string;

  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome muito longo' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsBrazilianPhone({ message: 'Telefone brasileiro inválido' })
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome muito longo' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsBrazilianPhone({ message: 'Telefone brasileiro inválido' })
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;
}
