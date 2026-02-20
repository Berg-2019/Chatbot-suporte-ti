import { IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional, IsUrl, ArrayMinSize } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'URL must be a valid HTTP or HTTPS URL' })
  url: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one event must be specified' })
  @IsString({ each: true })
  events: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsOptional()
  headers?: Record<string, string>;
}
