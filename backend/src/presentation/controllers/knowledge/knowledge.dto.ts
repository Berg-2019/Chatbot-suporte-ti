/**
 * Knowledge DTOs with Validation
 */

import {
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  content: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  content?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];
}

export class ArticleFeedbackDto {
  @IsBoolean()
  helpful: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class SearchArticlesDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  message: string;

  @IsOptional()
  @IsString()
  limit?: number;
}
