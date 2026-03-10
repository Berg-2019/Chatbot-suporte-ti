/**
 * Macros Service - Bulk Actions for Tickets
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MacroActionType } from './macros.dto';

export interface BulkActionResult {
    success: number;
    failed: number;
    errors: Array<{ ticketId: string; error: string }>;
}

@Injectable()
export class MacrosService {
    private readonly logger = new Logger(MacrosService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Execute macro action on multiple tickets
     */
    async executeBulkAction(
        ticketIds: string[],
        action: MacroActionType,
        value?: string,
        sendNotification: boolean = false,
    ): Promise<BulkActionResult> {
        const result: BulkActionResult = {
            success: 0,
            failed: 0,
            errors: [],
        };

        this.logger.log(`Executing bulk action: ${action} on ${ticketIds.length} tickets`);

        // Process each ticket
        for (const ticketId of ticketIds) {
            try {
                await this.executeActionOnTicket(ticketId, action, value);
                result.success++;
            } catch (error) {
                result.failed++;
                result.errors.push({
                    ticketId,
                    error: error.message || 'Unknown error',
                });
                this.logger.error(`Failed to execute ${action} on ticket ${ticketId}: ${error.message}`);
            }
        }

        this.logger.log(`Bulk action completed: ${result.success} success, ${result.failed} failed`);
        return result;
    }

    /**
     * Execute action on single ticket
     */
    private async executeActionOnTicket(
        ticketId: string,
        action: MacroActionType,
        value?: string,
    ): Promise<void> {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new NotFoundException(`Ticket ${ticketId} not found`);
        }

        switch (action) {
            case MacroActionType.ASSIGN_AGENT:
                if (!value) throw new BadRequestException('Agent ID is required');
                await this.assignAgent(ticketId, value);
                break;

            case MacroActionType.CHANGE_STATUS:
                if (!value) throw new BadRequestException('Status is required');
                await this.changeStatus(ticketId, value);
                break;

            case MacroActionType.CHANGE_PRIORITY:
                if (!value) throw new BadRequestException('Priority is required');
                await this.changePriority(ticketId, value);
                break;

            case MacroActionType.ADD_LABEL:
                if (!value) throw new BadRequestException('Label is required');
                await this.addLabel(ticketId, value);
                break;

            case MacroActionType.REMOVE_LABEL:
                if (!value) throw new BadRequestException('Label is required');
                await this.removeLabel(ticketId, value);
                break;

            case MacroActionType.SEND_MESSAGE:
                if (!value) throw new BadRequestException('Message is required');
                await this.sendMessage(ticketId, value);
                break;

            case MacroActionType.CLOSE_TICKET:
                await this.closeTicket(ticketId);
                break;

            default:
                throw new BadRequestException(`Unknown action: ${action}`);
        }
    }

    /**
     * Assign agent to ticket
     */
    private async assignAgent(ticketId: string, agentId: string): Promise<void> {
        if (!agentId) {
            throw new BadRequestException('Agent ID is required');
        }

        const agent = await this.prisma.user.findUnique({
            where: { id: agentId },
        });

        if (!agent) {
            throw new NotFoundException(`Agent ${agentId} not found`);
        }

        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { assignedToId: agentId },
        });

        this.logger.debug(`Assigned ticket ${ticketId} to agent ${agent.name}`);
    }

    /**
     * Change ticket status
     */
    private async changeStatus(ticketId: string, status: string): Promise<void> {
        if (!status) {
            throw new BadRequestException('Status is required');
        }

        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`Invalid status: ${status}`);
        }

        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: status as any },
        });

        this.logger.debug(`Changed ticket ${ticketId} status to ${status}`);
    }

    /**
     * Change ticket priority
     */
    private async changePriority(ticketId: string, priority: string): Promise<void> {
        if (!priority) {
            throw new BadRequestException('Priority is required');
        }

        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        if (!validPriorities.includes(priority)) {
            throw new BadRequestException(`Invalid priority: ${priority}`);
        }

        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { priority: priority as any },
        });

        this.logger.debug(`Changed ticket ${ticketId} priority to ${priority}`);
    }

    /**
     * Add label to ticket
     */
    private async addLabel(ticketId: string, label: string): Promise<void> {
        if (!label) {
            throw new BadRequestException('Label is required');
        }

        // Check if label already exists for this ticket
        const existing = await this.prisma.ticketLabel.findFirst({
            where: {
                ticketId,
                label,
            },
        });

        if (existing) {
            this.logger.debug(`Label "${label}" already exists on ticket ${ticketId}`);
            return; // Don't fail, just skip
        }

        await this.prisma.ticketLabel.create({
            data: {
                ticketId,
                label,
                color: this.getRandomColor(),
            },
        });

        this.logger.debug(`Added label "${label}" to ticket ${ticketId}`);
    }

    /**
     * Remove label from ticket
     */
    private async removeLabel(ticketId: string, label: string): Promise<void> {
        if (!label) {
            throw new BadRequestException('Label is required');
        }

        const existing = await this.prisma.ticketLabel.findFirst({
            where: {
                ticketId,
                label,
            },
        });

        if (!existing) {
            this.logger.debug(`Label "${label}" not found on ticket ${ticketId}`);
            return; // Don't fail, just skip
        }

        await this.prisma.ticketLabel.delete({
            where: { id: existing.id },
        });

        this.logger.debug(`Removed label "${label}" from ticket ${ticketId}`);
    }

    /**
     * Send message to ticket
     */
    private async sendMessage(ticketId: string, message: string): Promise<void> {
        if (!message) {
            throw new BadRequestException('Message is required');
        }

        // Create internal note with macro message
        await this.prisma.message.create({
            data: {
                ticketId,
                content: `[Macro] ${message}`,
                type: 'TEXT',
                direction: 'OUTGOING',
                isInternal: true, // Keep as internal note
                senderId: null, // System message
            },
        });

        this.logger.debug(`Sent message to ticket ${ticketId}`);
    }

    /**
     * Close ticket
     */
    private async closeTicket(ticketId: string): Promise<void> {
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
            },
        });

        this.logger.debug(`Closed ticket ${ticketId}`);
    }

    /**
     * Get random color for label
     */
    private getRandomColor(): string {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
            '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
            '#EC7063', '#AF7AC5', '#5DADE2', '#48C9B0', '#F4D03F',
            '#EB984E',
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Get bulk action statistics
     */
    async getBulkActionStats() {
        // Count tickets by status for bulk action suggestions
        const ticketsByStatus = await this.prisma.ticket.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        const ticketsByPriority = await this.prisma.ticket.groupBy({
            by: ['priority'],
            _count: { priority: true },
        });

        return {
            ticketsByStatus: ticketsByStatus.map((s) => ({
                status: s.status,
                count: s._count.status,
            })),
            ticketsByPriority: ticketsByPriority.map((p) => ({
                priority: p.priority,
                count: p._count.priority,
            })),
        };
    }
}
