import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LicensesService } from './licenses.service';
import { SectorGuard } from '../../../common/guards/sector.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CreateLicenseDto, UpdateLicenseDto, AssignLicenseDto } from './dto';

@Controller('licenses')
@UseGuards(AuthGuard('jwt'), SectorGuard, RolesGuard)
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async findAll(@Query() query: {
    search?: string;
    type?: string;
    expired?: string;
    page?: string;
    limit?: string;
  }) {
    return this.licensesService.findAll({
      search: query.search,
      type: query.type as any,
      expired: query.expired === 'true' ? true : query.expired === 'false' ? false : undefined,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }

  @Get('stats')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
  async getStats() {
    return this.licensesService.getStats();
  }

  @Get(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async create(@Body() dto: CreateLicenseDto) {
    return this.licensesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async update(@Param('id') id: string, @Body() dto: UpdateLicenseDto) {
    return this.licensesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.licensesService.remove(id);
  }

  @Post(':id/assign')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async assign(@Param('id') id: string, @Body() dto: AssignLicenseDto) {
    return this.licensesService.assign(id, dto);
  }

  @Patch('assignments/:assignmentId/unassign')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC')
  async unassign(@Param('assignmentId') assignmentId: string) {
    return this.licensesService.unassign(assignmentId);
  }
}