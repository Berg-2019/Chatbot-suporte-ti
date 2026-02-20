import { IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1, { message: 'At least one permission must be specified' })
  @IsString({ each: true })
  permissions?: string[];
}
