/**
 * DTO para escalação de conversa via Hermes Agent.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EscalationUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum EscalationArea {
  TI = 'TI',
  ELECTRIC = 'ELECTRIC',
}

export class ConversationMessage {
  @IsString()
  role: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  timestamp?: string;
}

export class EscalateDto {
  @IsString()
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  phone: string;

  @IsString()
  @IsOptional()
  ticketId?: string;

  @IsString()
  @IsOptional()
  ticketNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Resumo do problema é obrigatório' })
  problemSummary: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessage)
  conversationHistory?: ConversationMessage[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attemptedSolutions?: string[];

  @IsEnum(EscalationUrgency, { message: 'Urgência deve ser LOW, MEDIUM, HIGH ou CRITICAL' })
  urgency: EscalationUrgency;

  @IsEnum(EscalationArea, { message: 'Área deve ser TI ou ELECTRIC' })
  area: EscalationArea;
}
