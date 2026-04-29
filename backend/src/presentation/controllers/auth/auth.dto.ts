import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @MaxLength(100, { message: 'Senha muito longa' })
  password: string;
}

enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  STOCK_MANAGER = 'STOCK_MANAGER',
  VIEWER = 'VIEWER',
}

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  @MaxLength(100, { message: 'Senha muito longa' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Senha deve conter maiúscula, minúscula e número',
  })
  password: string;

  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome muito longo' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;
}
