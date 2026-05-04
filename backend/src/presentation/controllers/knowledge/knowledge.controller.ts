/**
 * Knowledge Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SectorGuard } from '../../../common/guards/sector.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeSearchService } from './knowledge-search.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, SectorGuard, RolesGuard)
export class KnowledgeController {
  constructor(
    private knowledgeService: KnowledgeService,
    private knowledgeSearchService: KnowledgeSearchService,
  ) {}

  @Get('articles')
  async findAll(
    @Query('category') category?: string,
    @Query('isPublic') isPublic?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.knowledgeService.findAll({
      category,
      isPublic: isPublic === 'true',
      tag,
      search,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('articles/popular')
  async getPopular(@Query('limit') limit?: string) {
    return this.knowledgeService.getPopular(limit ? parseInt(limit) : 10);
  }

  @Get('articles/categories')
  async getCategories() {
    return this.knowledgeService.getCategories();
  }

  @Get('articles/tags')
  async getTags() {
    return this.knowledgeService.getTags();
  }

  @Get('articles/:id')
  async findById(@Param('id') id: string) {
    return this.knowledgeService.findById(id);
  }

  @Get('articles/:id/related')
  async getRelated(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.knowledgeService.getRelated(id, limit ? parseInt(limit) : 5);
  }

  @Post('articles')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async create(
    @Body()
    dto: {
      title: string;
      content: string;
      category: string;
      isPublic?: boolean;
      isInternal?: boolean;
      tags?: string[];
    },
    @Request() req: any,
  ) {
    return this.knowledgeService.create({
      ...dto,
      authorId: req.user.id,
    });
  }

  @Put('articles/:id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      content?: string;
      category?: string;
      isPublic?: boolean;
      isInternal?: boolean;
      tags?: string[];
    },
  ) {
    return this.knowledgeService.update(id, dto);
  }

  @Delete('articles/:id')
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    return this.knowledgeService.delete(id);
  }

  @Post('articles/:id/feedback')
  async markHelpful(
    @Param('id') id: string,
    @Body() dto: { helpful: boolean; comment?: string },
    @Request() req: any,
  ) {
    return this.knowledgeService.markHelpful(
      id,
      req.user.id,
      dto.helpful,
      dto.comment,
    );
  }

  @Post('search/suggest')
  async suggestArticles(
    @Body() dto: { message: string; limit?: number },
  ) {
    return this.knowledgeSearchService.suggestArticles(
      dto.message,
      dto.limit || 5,
    );
  }

  @Get('search')
  async searchSimilar(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.knowledgeSearchService.searchSimilar(
      query,
      limit ? parseInt(limit) : 10,
    );
  }
}
