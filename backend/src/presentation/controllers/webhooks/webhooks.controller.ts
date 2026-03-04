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
// import { PermissionsGuard } from '../../../common/guards/permissions.guard';  // DISABLED - requires customRole model
import { RequirePermissions, RequireAllPermissions } from '../../../common/decorators/require-permissions.decorator';
import { WebhookService } from '../../../infrastructure/services/webhook.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  QueryWebhookDto,
} from '../../../domain/dtos/webhook';

@Controller('webhooks')
@UseGuards(AuthGuard('jwt'))  // PermissionsGuard DISABLED
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * GET /webhooks
   * Listar todos os webhooks
   */
  @Get()
  @RequirePermissions('webhooks:view')
  async findAll(@Query() query: QueryWebhookDto) {
    return this.webhookService.findAll(query);
  }

  /**
   * GET /webhooks/:id
   * Buscar webhook por ID
   */
  @Get(':id')
  @RequirePermissions('webhooks:view')
  async findOne(@Param('id') id: string) {
    return this.webhookService.findOne(id);
  }

  /**
   * GET /webhooks/:id/logs
   * Obter logs de execução (requer permissão de auditoria)
   */
  @Get(':id/logs')
  @RequireAllPermissions('webhooks:view', 'audit:view')
  async getLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.webhookService.getLogs(id, parsedLimit);
  }

  /**
   * GET /webhooks/:id/stats
   * Obter estatísticas do webhook
   */
  @Get(':id/stats')
  @RequirePermissions('webhooks:view')
  async getStats(@Param('id') id: string) {
    return this.webhookService.getStats(id);
  }

  /**
   * POST /webhooks
   * Criar novo webhook
   */
  @Post()
  @RequirePermissions('webhooks:create')
  async create(@Body() dto: CreateWebhookDto, @Req() req: any) {
    return this.webhookService.create({
      ...dto,
      createdBy: req.user.id,
    });
  }

  /**
   * POST /webhooks/:id/test
   * Testar webhook manualmente (operação sensível)
   */
  @Post(':id/test')
  @RequireAllPermissions('webhooks:test', 'webhooks:view')
  async test(@Param('id') id: string) {
    return this.webhookService.test(id);
  }

  /**
   * PATCH /webhooks/:id
   * Atualizar webhook
   */
  @Patch(':id')
  @RequirePermissions('webhooks:update')
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhookService.update(id, dto);
  }

  /**
   * DELETE /webhooks/:id
   * Deletar webhook (operação sensível)
   */
  @Delete(':id')
  @RequireAllPermissions('webhooks:delete', 'audit:view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.webhookService.delete(id);
  }
}
