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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private faqService: FaqService) {}

  // Endpoint público para busca (usado pelo bot)
  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) return [];
    return this.faqService.search(query);
  }

  // Listar todas (requer auth)
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.faqService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findById(@Param('id') id: string) {
    return this.faqService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'))
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
  async incrementViews(@Param('id') id: string) {
    return this.faqService.incrementViews(id);
  }

  // Marcar como útil (público - chamado pelo bot)
  @Post(':id/helpful')
  async markHelpful(@Param('id') id: string) {
    return this.faqService.markHelpful(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deactivate(@Param('id') id: string) {
    return this.faqService.deactivate(id);
  }
}
