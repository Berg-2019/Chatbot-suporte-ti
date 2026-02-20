import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, ArrayMinSize } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission must be specified' })
  @IsString({ each: true })
  permissions: string[];

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}
