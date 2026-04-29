/**
 * DTO para criação de reserva de equipamento via Hermes Agent.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateHermesReservationDto {
  @IsString()
  @IsNotEmpty({ message: 'ID do item de estoque é obrigatório' })
  stockItemId: string;

  @IsDateString({}, { message: 'Data de início deve ser uma data válida (ISO8601)' })
  startTime: string;

  @IsDateString({}, { message: 'Data de fim deve ser uma data válida (ISO8601)' })
  endTime: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome do solicitante é obrigatório' })
  requesterName: string;

  @IsString()
  @IsOptional()
  requesterSector?: string;
}
