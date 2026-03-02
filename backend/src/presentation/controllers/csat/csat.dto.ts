/**
 * CSAT DTOs - Data Transfer Objects
 */

import { IsString, IsInt, Min, Max, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendCsatDto {
  @IsString()
  ticketId: string;

  @IsEnum(['whatsapp', 'web', 'email'])
  channel: 'whatsapp' | 'web' | 'email';
}

export class SubmitCsatDto {
  @IsString()
  ticketId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class CsatReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(5)
  maxRating?: number;
}

export class ReviewNoteDto {
  @IsString()
  note: string;

  @IsString()
  reviewedBy: string;
}
