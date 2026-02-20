import { IsString, IsOptional } from 'class-validator';

export class QueryCannedResponseDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
