import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO para POST /auth/activation/:token — define a senha do agente.
 */
export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres' })
  @MaxLength(128, { message: 'A senha deve ter no máximo 128 caracteres' })
  password!: string;
}
