import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';
import { SectorGuard } from '../../../common/guards/sector.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CreateAssetDto, UpdateAssetDto, AssignAssetDto, ReturnAssetDto } from './dto';

@Controller('assets')
@UseGuards(AuthGuard('jwt'), SectorGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async findAll(@Query() query: {
    sector?: string;
    category?: string;
    status?: string;
    search?: string;
    location?: string;
    page?: string;
    limit?: string;
  }) {
    return this.assetsService.findAll({
      sector: query.sector as any,
      category: query.category as any,
      status: query.status as any,
      search: query.search,
      location: query.location,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }

  @Get('stats')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
  async getStats() {
    return this.assetsService.getStats();
  }

  @Get(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async findById(@Param('id') id: string) {
    return this.assetsService.findById(id);
  }

  @Get('tag/:tag')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async findByTag(@Param('tag') tag: string) {
    return this.assetsService.findByTag(tag);
  }

  @Post()
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Post(':id/assign')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {
    return this.assetsService.assign(id, dto.userId, dto.reason);
  }

  @Post(':id/return')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async returnAsset(@Param('id') id: string, @Body() _dto: ReturnAssetDto) {
    return this.assetsService.returnAsset(id);
  }

  @Get(':id/history')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT')
  async getHistory(@Param('id') id: string) {
    return this.assetsService.getHistory(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }
}