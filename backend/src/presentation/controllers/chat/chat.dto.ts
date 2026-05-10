/**
 * DTOs for Chat
 */

import { IsString, IsOptional, IsEnum, IsBooleanString } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  kind?: 'text' | 'image' | 'video' | 'audio' | 'file';

  @IsOptional()
  @IsString()
  isInternal?: string;

  @IsOptional()
  @IsString()
  duration?: string;
}
