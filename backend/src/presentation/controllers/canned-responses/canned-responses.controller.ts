import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CannedResponseService } from '../../../infrastructure/services/canned-response.service';
import {
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
  QueryCannedResponseDto,
} from '../../../domain/dtos/canned-response';

@Controller('canned-responses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CannedResponsesController {
  constructor(private readonly cannedResponseService: CannedResponseService) {}

  /**
   * GET /canned-responses
   * Listar todas as respostas prontas com filtros
   */
  @Get()
  @Roles('ADMIN', 'AGENT')
  async findAll(@Query() query: QueryCannedResponseDto) {
    return this.cannedResponseService.findAll(query);
  }

  /**
   * GET /canned-responses/categories
   * Listar categorias únicas
   */
  @Get('categories')
  @Roles('ADMIN', 'AGENT')
  async getCategories() {
    return this.cannedResponseService.getCategories();
  }

  /**
   * GET /canned-responses/suggest?q=saudacao
   * Autocomplete para o chat
   */
  @Get('suggest')
  @Roles('ADMIN', 'AGENT')
  async suggest(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.cannedResponseService.suggest(query, 5);
  }

  /**
   * GET /canned-responses/:id
   * Buscar resposta pronta por ID
   */
  @Get(':id')
  @Roles('ADMIN', 'AGENT')
  async findOne(@Param('id') id: string) {
    return this.cannedResponseService.findOne(id);
  }

  /**
   * GET /canned-responses/shortcode/:shortcode
   * Buscar por shortcode
   */
  @Get('shortcode/:shortcode')
  @Roles('ADMIN', 'AGENT')
  async findByShortcode(@Param('shortcode') shortcode: string) {
    return this.cannedResponseService.findByShortcode(shortcode);
  }

  /**
   * POST /canned-responses
   * Criar nova resposta pronta
   */
  @Post()
  @Roles('ADMIN', 'AGENT')
  async create(@Body() dto: CreateCannedResponseDto, @Req() req: any) {
    return this.cannedResponseService.create({
      ...dto,
      createdBy: req.user.id,
    });
  }

  /**
   * PATCH /canned-responses/:id
   * Atualizar resposta pronta
   */
  @Patch(':id')
  @Roles('ADMIN', 'AGENT')
  async update(@Param('id') id: string, @Body() dto: UpdateCannedResponseDto) {
    return this.cannedResponseService.update(id, dto);
  }

  /**
   * DELETE /canned-responses/:id
   * Deletar resposta pronta
   */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.cannedResponseService.delete(id);
  }
}
