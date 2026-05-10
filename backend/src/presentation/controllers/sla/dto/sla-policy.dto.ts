import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Priority, Sector } from '@prisma/client';

export class CreateSlaPolicyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Sector)
  sector: Sector;

  @IsEnum(Priority)
  priority: Priority;

  @IsInt()
  @Min(1)
  @Max(10080)
  responseTimeMins: number;

  @IsInt()
  @Min(1)
  @Max(10080)
  resolutionTimeMins: number;

  @IsString()
  @IsOptional()
  businessHoursId?: string;
}

export class UpdateSlaPolicyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(Sector)
  @IsOptional()
  sector?: Sector;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsInt()
  @Min(1)
  @Max(10080)
  @IsOptional()
  responseTimeMins?: number;

  @IsInt()
  @Min(1)
  @Max(10080)
  @IsOptional()
  resolutionTimeMins?: number;

  @IsString()
  @IsOptional()
  businessHoursId?: string;

  @IsOptional()
  active?: boolean;
}
