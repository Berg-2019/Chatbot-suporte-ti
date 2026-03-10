import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum SettingDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

export class CreateSettingDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SettingDataType)
  dataType?: SettingDataType;
}

export class UpdateSettingDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SettingDataType)
  dataType?: SettingDataType;
}

export class BulkUpdateSettingsDto {
  @IsOptional()
  settings?: Record<string, string>;
}
