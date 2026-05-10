/**
 * DTO for marking FAQ as helpful
 */

import { IsBoolean } from 'class-validator';

export class MarkFaqHelpfulDto {
  @IsBoolean()
  helpful: boolean;
}
