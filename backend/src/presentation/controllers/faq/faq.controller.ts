/**
 * FAQ Controller - Base de Conhecimento API
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
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { FaqService } from './faq.service';

@Controller('faq')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaqController {
  constructor(private faqService: FaqService) {}

  // Endpoint público para busca (usado pelo bot)
  @Get('search')
  @SetMetadata('isPublic', true)
  async search(@Query('q') query: string) {
    if (!query) return [];
    return this.faqService.search(query);
  }

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.faqService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.faqService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'AGENT')
  async create(
    @Body()
    dto: {
      question: string;
      answer: string;
      keywords: string;
      category?: string;
    },
  ) {
    return this.faqService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'AGENT')
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      question?: string;
      answer?: string;
      keywords?: string;
      category?: string;
      active?: boolean;
    },
  ) {
    return this.faqService.update(id, dto);
  }

  // Incrementar views (público - chamado pelo bot)
  @Post(':id/view')
  @SetMetadata('isPublic', true)
  async incrementViews(@Param('id') id: string) {
    return this.faqService.incrementViews(id);
  }

  // Marcar como útil (público - chamado pelo bot)
  @Post(':id/helpful')
  @SetMetadata('isPublic', true)
  async markHelpful(@Param('id') id: string) {
    return this.faqService.markHelpful(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deactivate(@Param('id') id: string) {
    return this.faqService.deactivate(id);
  }
}
