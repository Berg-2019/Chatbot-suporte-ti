/**
 * Bot Variables Controller
 * Endpoints para gerenciar variáveis dinâmicas do bot
 */

import { Controller, Post, Put, Delete, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { BotVariablesService } from './bot-variables.service';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

class CreateVariableDto {
  key: string;
  value: string;
  description?: string;
  category?: string;
}

class UpdateVariableDto {
  value?: string;
  description?: string;
  category?: string;
}

class InterpolateDto {
  template: string;
  customVars?: Record<string, string>;
}

@Controller('bot-variables')
@UseGuards(AuthGuard('jwt'))
export class BotVariablesController {
  constructor(private readonly botVariablesService: BotVariablesService) {}

  /**
   * Cria nova variável
   * POST /bot-variables
   */
  @Post()
  @RequirePermissions('admin:settings', 'bot:config')
  async create(@Body() dto: CreateVariableDto) {
    return this.botVariablesService.create(dto);
  }

  /**
   * Atualiza variável existente
   * PUT /bot-variables/:key
   */
  @Put(':key')
  @RequirePermissions('admin:settings', 'bot:config')
  async update(@Param('key') key: string, @Body() dto: UpdateVariableDto) {
    return this.botVariablesService.update(key, dto);
  }

  /**
   * Deleta variável
   * DELETE /bot-variables/:key
   */
  @Delete(':key')
  @RequirePermissions('admin:settings')
  async delete(@Param('key') key: string) {
    return this.botVariablesService.delete(key);
  }

  /**
   * Lista todas as variáveis
   * GET /bot-variables?category=general
   */
  @Get()
  @RequirePermissions('bot:config', 'admin:settings')
  async findAll(@Query('category') category?: string) {
    return this.botVariablesService.findAll(category);
  }

  /**
   * Busca variável específica
   * GET /bot-variables/:key
   */
  @Get(':key')
  @RequirePermissions('bot:config', 'admin:settings')
  async findOne(@Param('key') key: string) {
    return this.botVariablesService.findOne(key);
  }

  /**
   * Interpola template com variáveis
   * POST /bot-variables/interpolate
   */
  @Post('action/interpolate')
  async interpolate(@Body() dto: InterpolateDto) {
    return {
      original: dto.template,
      interpolated: this.botVariablesService.interpolate(dto.template, dto.customVars),
    };
  }

  /**
   * Cria variáveis padrão do sistema (seed)
   * POST /bot-variables/action/seed
   */
  @Post('action/seed')
  @RequirePermissions('admin:settings')
  async seed() {
    return this.botVariablesService.seedDefaultVariables();
  }

  /**
   * Lista categorias disponíveis
   * GET /bot-variables/action/categories
   */
  @Get('action/categories')
  @RequirePermissions('bot:config', 'admin:settings')
  async getCategories() {
    return this.botVariablesService.getCategories();
  }
}
