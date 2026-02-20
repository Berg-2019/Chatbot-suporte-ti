import { IsString, IsNotEmpty, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateCannedResponseDto {
  @IsString()
  @IsNotEmpty({ message: 'Shortcode is required' })
  @MinLength(2, { message: 'Shortcode must be at least 2 characters' })
  @MaxLength(50, { message: 'Shortcode must not exceed 50 characters' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Shortcode can only contain lowercase letters, numbers, hyphens, and underscores',
  })
  shortcode: string;

  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MinLength(1, { message: 'Content cannot be empty' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;
}
