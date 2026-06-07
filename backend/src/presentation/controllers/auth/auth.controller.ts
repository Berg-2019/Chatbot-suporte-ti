/**
 * Auth Controller
 */

import { Controller, Post, Get, Delete, Body, UseGuards, Request, Res, Req, Param, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { Response, Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SetPasswordDto } from './dto/activation.dto';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
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

const COOKIE_NAME = 'helpdesk_session';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    const cookieDomain = this.config.get<string>('COOKIE_DOMAIN');
    const cookieSecure = this.config.get<string>('COOKIE_SECURE') !== 'false';

    res.cookie(COOKIE_NAME, result.token, {
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    const { token: _token, user } = result;
    return { user };
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt'))
  async register(@Body() dto: RegisterDto, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins podem criar usuários');
    }
    return this.authService.register(dto, req.user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Request() req: any) {
    return { user: req.user };
  }

  @Get('me/data-export')
  @UseGuards(AuthGuard('jwt'))
  async dataExport(@Request() req: any) {
    return this.authService.dataExport(req.user.id);
  }

  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  async eraseAccount(@Request() req: any) {
    return this.authService.eraseAccount(req.user.id);
  }

  // --------------------------------------------------------------------------
  // Ativação de agente (link por email/WhatsApp) — endpoints PÚBLICOS
  // --------------------------------------------------------------------------

  @Get('activation/:token')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async getActivation(@Param('token') token: string) {
    return this.authService.validateActivationToken(token);
  }

  @Post('activation/:token')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async activate(
    @Param('token') token: string,
    @Body() dto: SetPasswordDto,
  ) {
    return this.authService.activateUser(token, dto.password);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieDomain = this.config.get<string>('COOKIE_DOMAIN');
    const cookieSecure = this.config.get<string>('COOKIE_SECURE') !== 'false';
    res.clearCookie(COOKIE_NAME, {
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax',
    });
    return { message: 'Logout realizado' };
  }
}

