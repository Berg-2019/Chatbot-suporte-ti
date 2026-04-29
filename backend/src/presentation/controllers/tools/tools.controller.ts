import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ToolsService } from './tools.service';

@Controller('tools')
@UseGuards(JwtAuthGuard)
export class ToolsController {
  constructor(private toolsService: ToolsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('stockType') stockType?: string,
  ) {
    return this.toolsService.findAll({ status, stockType });
  }

  @Get('loans')
  async getLoans(@Query('returned') returned?: string) {
    return this.toolsService.getLoans({
      returned: returned === 'true' ? true : returned === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.toolsService.findById(id);
  }

  @Post()
  async create(@Body() body: {
    name: string;
    category?: string;
    serialNumber?: string;
    brand?: string;
    location?: string;
    notes?: string;
    stockType?: string;
  }) {
    return this.toolsService.create({
      name: body.name,
      category: (body.category as any) || 'MANUAL',
      serialNumber: body.serialNumber,
      brand: body.brand,
      location: body.location,
      notes: body.notes,
      stockType: body.stockType,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      category: string;
      status: string;
      serialNumber: string;
      brand: string;
      location: string;
      notes: string;
    }>,
  ) {
    return this.toolsService.update(id, {
      name: body.name,
      category: body.category as any,
      status: body.status as any,
      serialNumber: body.serialNumber,
      brand: body.brand,
      location: body.location,
      notes: body.notes,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.toolsService.delete(id);
  }

  @Post(':id/loan')
  async loan(
    @Param('id') id: string,
    @Body() body: { borrower: string; reason?: string; expectedReturn?: string; loanedBy?: string },
  ) {
    return this.toolsService.loan(id, {
      borrower: body.borrower,
      reason: body.reason,
      expectedReturn: body.expectedReturn,
      loanedBy: body.loanedBy,
    });
  }

  @Post(':id/return')
  async returnTool(@Param('id') id: string, @Body() body?: { returnedBy?: string }) {
    return this.toolsService.returnTool(id, body?.returnedBy);
  }
}