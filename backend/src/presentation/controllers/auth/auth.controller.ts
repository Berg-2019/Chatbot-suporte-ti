/**
 * Auth Controller
 */

import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class GlpiLoginDto {
  @IsString()
  login: string;

  @IsString()
  password: string;
}

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: 'ADMIN' | 'AGENT';
}

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  /**
   * Login tradicional (email + senha local)
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Login via GLPI (SSO)
   * Usa credenciais do GLPI para autenticar
   */
  @Post('glpi-login')
  async glpiLogin(@Body() dto: GlpiLoginDto) {
    return this.authService.loginWithGlpi(dto);
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  async register(@Body() dto: RegisterDto, @Request() req: any) {
    // Somente admin pode registrar
    if (req.user.role !== 'ADMIN') {
      throw new Error('Apenas admins podem criar usuários');
    }
    return this.authService.register(dto, req.user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Request() req: any) {
    return { user: req.user };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout() {
    return { message: 'Logout realizado' };
  }
}

