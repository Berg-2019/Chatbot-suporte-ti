import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PurchaseRequestsService } from './purchase-requests.service';
import {
  CreatePurchaseRequestDto,
  QueryPurchaseRequestDto,
  ApprovePurchaseRequestDto,
  RejectPurchaseRequestDto,
} from './purchase-requests.dto';
import { Sector } from '@prisma/client';

@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseRequestsController {
  constructor(private readonly service: PurchaseRequestsService) {}

  @Post()
  @Roles('ADMIN_TI', 'ADMIN_ELECTRIC', 'AGENT', 'ADMIN')
  async create(@Body() dto: CreatePurchaseRequestDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @Roles('ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT', 'ADMIN')
  async findAll(@Query() query: QueryPurchaseRequestDto, @Request() req: any) {
    return this.service.findAll(
      query,
      req.user.role,
      req.user.sector as Sector,
    );
  }

  @Get(':id')
  @Roles('ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT', 'ADMIN')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/approve')
  @Roles('ADMIN_COMPRAS', 'ADMIN')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseRequestDto,
    @Request() req: any,
  ) {
    return this.service.approve(id, req.user.id, dto.notes);
  }

  @Patch(':id/reject')
  @Roles('ADMIN_COMPRAS', 'ADMIN')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectPurchaseRequestDto,
    @Request() req: any,
  ) {
    return this.service.reject(id, req.user.id, dto.rejectionReason);
  }

  @Patch(':id/mark-purchased')
  @Roles('ADMIN_COMPRAS', 'ADMIN')
  async markPurchased(@Param('id') id: string, @Request() req: any) {
    return this.service.markPurchased(id, req.user.id);
  }

  @Patch(':id/mark-delivered')
  @Roles('ADMIN_COMPRAS', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN')
  async markDelivered(@Param('id') id: string, @Request() req: any) {
    return this.service.markDelivered(id, req.user.id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT', 'ADMIN')
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancel(id, req.user.id);
  }
}