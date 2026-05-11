import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';

const VALID_LEVELS = new Set(['ERROR', 'WARN', 'INFO', 'DEBUG', 'LOG', 'VERBOSE']);

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  @Get()
  @Roles(UserRole.ADMIN)
  async getLogs(
    @Query('lines') lines: string = '500',
    @Query('level') level?: string,
  ) {
    const linesNum = Math.min(parseInt(lines) || 500, 1000);
    const logPath = process.env.LOG_FILE_PATH || '/var/log/helpdesk/app.log';

    try {
      const content = await readFile(logPath, 'utf-8').catch(() => null);
      if (!content) {
        return { total: 0, logs: [], error: 'Log file not found or not accessible' };
      }

      let logLines = content
        .split('\n')
        .filter((line) => line.trim())
        .slice(-linesNum);

      if (level && VALID_LEVELS.has(level.toUpperCase())) {
        const target = level.toUpperCase();
        logLines = logLines.filter((line) => line.toUpperCase().includes(target));
      }

      return {
        total: logLines.length,
        logs: logLines.map((line) => this.parseLogLine(line)),
      };
    } catch (error) {
      return {
        total: 0,
        logs: [],
        error: 'Log file not found or not accessible',
        message: error.message,
      };
    }
  }

  @Get('download')
  @Roles(UserRole.ADMIN)
  async downloadLogs() {
    const logPath = process.env.LOG_FILE_PATH || '/var/log/helpdesk/app.log';
    return { downloadUrl: `/files/logs/app.log`, path: logPath };
  }

  private parseLogLine(line: string) {
    try {
      return JSON.parse(line);
    } catch {
      return {
        message: line,
        timestamp: new Date().toISOString(),
        level: this.detectLevel(line),
      };
    }
  }

  private detectLevel(line: string): string {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error')) return 'ERROR';
    if (lowerLine.includes('warn')) return 'WARN';
    if (lowerLine.includes('debug')) return 'DEBUG';
    return 'INFO';
  }
}
