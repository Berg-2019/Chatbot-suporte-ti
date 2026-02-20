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
import { WebhookService } from '../../../infrastructure/services/webhook.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  QueryWebhookDto,
} from '../../../domain/dtos/webhook';

@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * GET /webhooks
   * Listar todos os webhooks
   */
  @Get()
  @Roles('ADMIN')
  async findAll(@Query() query: QueryWebhookDto) {
    return this.webhookService.findAll(query);
  }

  /**
   * GET /webhooks/:id
   * Buscar webhook por ID
   */
  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    return this.webhookService.findOne(id);
  }

  /**
   * GET /webhooks/:id/logs
   * Obter logs de execução
   */
  @Get(':id/logs')
  @Roles('ADMIN')
  async getLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.webhookService.getLogs(id, parsedLimit);
  }

  /**
   * GET /webhooks/:id/stats
   * Obter estatísticas do webhook
   */
  @Get(':id/stats')
  @Roles('ADMIN')
  async getStats(@Param('id') id: string) {
    return this.webhookService.getStats(id);
  }

  /**
   * POST /webhooks
   * Criar novo webhook
   */
  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateWebhookDto, @Req() req: any) {
    return this.webhookService.create({
      ...dto,
      createdBy: req.user.id,
    });
  }

  /**
   * POST /webhooks/:id/test
   * Testar webhook manualmente
   */
  @Post(':id/test')
  @Roles('ADMIN')
  async test(@Param('id') id: string) {
    return this.webhookService.test(id);
  }

  /**
   * PATCH /webhooks/:id
   * Atualizar webhook
   */
  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhookService.update(id, dto);
  }

  /**
   * DELETE /webhooks/:id
   * Deletar webhook
   */
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.webhookService.delete(id);
  }
}
