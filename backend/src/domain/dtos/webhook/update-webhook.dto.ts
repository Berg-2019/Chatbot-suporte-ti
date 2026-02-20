import { IsString, IsArray, IsBoolean, IsOptional, IsUrl, ArrayMinSize } from 'class-validator';

export class UpdateWebhookDto {
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'URL must be a valid HTTP or HTTPS URL' })
  url?: string;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1, { message: 'At least one event must be specified' })
  @IsString({ each: true })
  events?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsOptional()
  headers?: Record<string, string>;
}
