import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { Sector } from '@prisma/client';

import { TechnicalReportsService } from './technical-reports.service';
import { SectorGuard } from '../../../common/guards/sector.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CreateTechnicalReportDto,
  UpdateTechnicalReportDto,
  QueryTechnicalReportDto,
  UpdateStatusDto,
  CreateAnnotationDto,
  SignTechnicalReportDto,
} from './dto';

@Controller('technical-reports')
@UseGuards(AuthGuard('jwt'), SectorGuard, RolesGuard)
export class TechnicalReportsController {
  constructor(private readonly service: TechnicalReportsService) {}

  @Get()
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async findAll(@Query() query: QueryTechnicalReportDto, @Request() req: any) {
    return this.service.findAll({
      sector: req.user.sector as Sector,
      status: query.status,
      serviceDateFrom: query.serviceDateFrom ? new Date(query.serviceDateFrom) : undefined,
      serviceDateTo: query.serviceDateTo ? new Date(query.serviceDateTo) : undefined,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.service.findById(id, req.user.sector as Sector);
  }

  @Post()
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async create(@Body() dto: CreateTechnicalReportDto, @Request() req: any) {
    return this.service.create(
      {
        ...dto,
        serviceDate: new Date(dto.serviceDate),
      },
      req.user.id,
      req.user.sector as Sector,
    );
  }

  @Patch(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTechnicalReportDto,
    @Request() req: any,
  ) {
    return this.service.update(
      id,
      {
        ...dto,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
      },
      req.user.sector as Sector,
    );
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Request() req: any,
  ) {
    return this.service.setStatus(id, dto.status, req.user.sector as Sector);
  }

  @Delete(':id')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.service.softDelete(id, req.user.sector as Sector);
  }

  // -------- Media --------

  @Post(':id/media')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.service.addMedia(id, file, req.user.id, req.user.sector as Sector);
  }

  @Get(':id/media/:mediaId/file')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async getMediaFile(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const media = await this.service.getMedia(id, mediaId, req.user.sector as Sector);
    res.set({
      'Content-Type': media.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(media.filename)}"`,
    });
    return new StreamableFile(createReadStream(media.path));
  }

  @Delete(':id/media/:mediaId')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Request() req: any,
  ) {
    return this.service.deleteMedia(
      id,
      mediaId,
      req.user.id,
      req.user.role,
      req.user.sector as Sector,
    );
  }

  // -------- Annotations --------

  @Post(':id/annotations')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async addAnnotation(
    @Param('id') id: string,
    @Body() dto: CreateAnnotationDto,
    @Request() req: any,
  ) {
    return this.service.addAnnotation(
      id,
      dto,
      req.user.id,
      req.user.sector as Sector,
    );
  }

  @Patch(':id/annotations/:annId/resolve')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async resolveAnnotation(
    @Param('id') id: string,
    @Param('annId') annId: string,
    @Request() req: any,
  ) {
    return this.service.resolveAnnotation(id, annId, req.user.sector as Sector);
  }

  // -------- Signature --------

  @Get(':id/signatures/:sigId/file')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  async getSignatureFile(
    @Param('id') id: string,
    @Param('sigId') sigId: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sig = await this.service.getSignature(id, sigId, req.user.sector as Sector);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="signature-${sig.id}.png"`,
    });
    return new StreamableFile(createReadStream(sig.imagePath));
  }

  @Post(':id/sign')
  @Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS', 'AGENT')
  @UseInterceptors(FileInterceptor('file'))
  async sign(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SignTechnicalReportDto,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Imagem da assinatura obrigatória');
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    return this.service.addSignature(
      id,
      file,
      dto,
      req.user.id ?? null,
      ip,
      req.user.sector as Sector,
    );
  }
}
