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
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CannedResponseService } from '../../../infrastructure/services/canned-response.service';
import {
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
  QueryCannedResponseDto,
} from '../../../domain/dtos/canned-response';

@Controller('canned-responses')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CannedResponsesController {
  constructor(private readonly cannedResponseService: CannedResponseService) {}

  /**
   * GET /canned-responses
   * Listar todas as respostas prontas com filtros
   */
  @Get()
  @RequirePermissions('canned_responses:view')
  async findAll(@Query() query: QueryCannedResponseDto) {
    return this.cannedResponseService.findAll(query);
  }

  /**
   * GET /canned-responses/categories
   * Listar categorias únicas
   */
  @Get('categories')
  @RequirePermissions('canned_responses:view')
  async getCategories() {
    return this.cannedResponseService.getCategories();
  }

  /**
   * GET /canned-responses/suggest?q=saudacao
   * Autocomplete para o chat
   */
  @Get('suggest')
  @RequirePermissions('canned_responses:view')
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
  @RequirePermissions('canned_responses:view')
  async findOne(@Param('id') id: string) {
    return this.cannedResponseService.findOne(id);
  }

  /**
   * GET /canned-responses/shortcode/:shortcode
   * Buscar por shortcode
   */
  @Get('shortcode/:shortcode')
  @RequirePermissions('canned_responses:view')
  async findByShortcode(@Param('shortcode') shortcode: string) {
    return this.cannedResponseService.findByShortcode(shortcode);
  }

  /**
   * POST /canned-responses
   * Criar nova resposta pronta
   */
  @Post()
  @RequirePermissions('canned_responses:create')
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
  @RequirePermissions('canned_responses:update')
  async update(@Param('id') id: string, @Body() dto: UpdateCannedResponseDto) {
    return this.cannedResponseService.update(id, dto);
  }

  /**
   * DELETE /canned-responses/:id
   * Deletar resposta pronta
   */
  @Delete(':id')
  @RequirePermissions('canned_responses:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.cannedResponseService.delete(id);
  }
}
