/**
 * DTO para criação de ticket via Hermes Agent.
 * Validação automática com class-validator.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Sector } from '@prisma/client';

export enum HermesTicketArea {
  TI = 'TI',
  ELECTRIC = 'ELECTRIC',
}

export class CreateHermesTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @MaxLength(200, { message: 'Título deve ter no máximo 200 caracteres' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @MinLength(5, { message: 'Descrição deve ter no mínimo 5 caracteres' })
  description: string;

  @IsEnum(HermesTicketArea, { message: 'Área deve ser TI ou ELECTRIC' })
  area: HermesTicketArea;

  @IsEnum(Sector)
  @IsOptional()
  sector?: Sector;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  requesterName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  phone: string;
}
