/**
 * Bot Variables Controller
 * Endpoints para gerenciar variáveis dinâmicas do bot
 */

import { Controller, Post, Put, Delete, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { BotVariablesService } from './bot-variables.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';

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
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BotVariablesController {
  constructor(private readonly botVariablesService: BotVariablesService) {}

  /**
   * Cria nova variável
   * POST /bot-variables
   */
  @Post()
  @Roles('ADMIN_TI')
  async create(@Body() dto: CreateVariableDto) {
    return this.botVariablesService.create(dto);
  }

  /**
   * Atualiza variável existente
   * PUT /bot-variables/:key
   */
  @Put(':key')
  @Roles('ADMIN_TI')
  async update(@Param('key') key: string, @Body() dto: UpdateVariableDto) {
    return this.botVariablesService.update(key, dto);
  }

  /**
   * Deleta variável
   * DELETE /bot-variables/:key
   */
  @Delete(':key')
  @Roles('ADMIN_TI')
  async delete(@Param('key') key: string) {
    return this.botVariablesService.delete(key);
  }

  /**
   * Lista todas as variáveis
   * GET /bot-variables?category=general
   */
  @Get()
  @Roles('ADMIN_TI')
  async findAll(@Query('category') category?: string) {
    return this.botVariablesService.findAll(category);
  }

  /**
   * Busca variável específica
   * GET /bot-variables/:key
   */
  @Get(':key')
  @Roles('ADMIN_TI')
  async findOne(@Param('key') key: string) {
    return this.botVariablesService.findOne(key);
  }

  /**
   * Interpola template com variáveis
   * POST /bot-variables/interpolate
   */
  @Post('action/interpolate')
  @Roles('ADMIN_TI')
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
  @Roles('ADMIN_TI')
  async seed() {
    return this.botVariablesService.seedDefaultVariables();
  }

  /**
   * Lista categorias disponíveis
   * GET /bot-variables/action/categories
   */
  @Get('action/categories')
  @Roles('ADMIN_TI')
  async getCategories() {
    return this.botVariablesService.getCategories();
  }
}
