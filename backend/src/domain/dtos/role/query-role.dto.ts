import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryRoleDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSystem?: boolean;
}
