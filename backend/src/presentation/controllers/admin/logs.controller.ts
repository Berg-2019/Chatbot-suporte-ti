/**
 * Logs Controller - Server logs viewer (Admin only)
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';

const execAsync = promisify(exec);

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  @Get()
  @Roles(UserRole.ADMIN)
  async getLogs(
    @Query('lines') lines: string = '500',
    @Query('level') level?: string, // ERROR, WARN, INFO, DEBUG
  ) {
    const linesNum = Math.min(parseInt(lines) || 500, 1000); // Max 1000 lines

    // Log file path (adjust based on your setup)
    const logPath = process.env.LOG_FILE_PATH || '/var/log/helpdesk/app.log';

    try {
      let command = `tail -n ${linesNum} ${logPath}`;

      if (level) {
        command += ` | grep "${level}"`;
      }

      const { stdout } = await execAsync(command);

      const logLines = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => this.parseLogLine(line));

      return {
        total: logLines.length,
        logs: logLines,
      };
    } catch (error) {
      // If file doesn't exist or command fails, return logs from console
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

    return {
      downloadUrl: `/files/logs/app.log`,
      path: logPath,
    };
  }

  private parseLogLine(line: string) {
    // Try to parse as JSON (structured logging)
    try {
      return JSON.parse(line);
    } catch {
      // If not JSON, return as plain text with timestamp
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
