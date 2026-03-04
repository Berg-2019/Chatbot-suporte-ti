/**
 * Agent Metrics Controller
 * Endpoints para métricas de performance dos técnicos
 */

import { Controller, Get, Param, Query, UseGuards, Post } from '@nestjs/common';
import { AgentMetricsService } from './agent-metrics.service';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';

class GetMetricsQueryDto {
  startDate: string; // ISO date
  endDate: string; // ISO date
}

@Controller('agent-metrics')
@UseGuards(AuthGuard('jwt'))
export class AgentMetricsController {
  constructor(private readonly agentMetricsService: AgentMetricsService) {}

  /**
   * Retorna métricas de um agente específico
   * GET /agent-metrics/:agentId?startDate=...&endDate=...
   */
  @Get(':agentId')
  @RequirePermissions('reports:read', 'admin:settings')
  async getAgentMetrics(@Param('agentId') agentId: string, @Query() query: GetMetricsQueryDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.agentMetricsService.getAgentMetrics(agentId, startDate, endDate);
  }

  /**
   * Retorna métricas de todos os agentes
   * GET /agent-metrics?startDate=...&endDate=...
   */
  @Get()
  @RequirePermissions('reports:read', 'admin:settings')
  async getAllMetrics(@Query() query: GetMetricsQueryDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.agentMetricsService.getAllAgentsMetrics(startDate, endDate);
  }

  /**
   * Retorna ranking de agentes
   * GET /agent-metrics/ranking/resolved?startDate=...&endDate=...
   * GET /agent-metrics/ranking/csat?startDate=...&endDate=...
   * GET /agent-metrics/ranking/response_time?startDate=...&endDate=...
   */
  @Get('ranking/:metric')
  @RequirePermissions('reports:read', 'admin:settings')
  async getRanking(@Param('metric') metric: 'resolved' | 'csat' | 'response_time', @Query() query: GetMetricsQueryDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.agentMetricsService.getRanking(metric, { start: startDate, end: endDate });
  }

  /**
   * Força atualização das métricas de um agente
   * POST /agent-metrics/:agentId/update
   */
  @Post(':agentId/update')
  @RequirePermissions('admin:settings')
  async forceUpdate(@Param('agentId') agentId: string) {
    return this.agentMetricsService.updateAgentMetrics(agentId);
  }
}
