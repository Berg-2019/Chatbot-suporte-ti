/**
 * Alert Service - Serviço de alertas para técnicos
 * Envia notificações via WhatsApp e Socket.IO
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { AlertType } from '@prisma/client';

export interface AlertPayload {
    ticketId?: string;
    type: AlertType;
    title: string;
    message: string;
    priority?: string;
    slaRemaining?: string;
}

@Injectable()
export class AlertService {
    constructor(
        private prisma: PrismaService,
        private rabbitmq: RabbitMQService,
    ) { }

    /**
     * Enviar alerta para um técnico específico
     */
    async sendAlertToUser(userId: string, payload: AlertPayload): Promise<void> {
        // Buscar técnico
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                receiveAlerts: true,
            },
        });

        if (!user) {
            console.warn(`⚠️ Usuário ${userId} não encontrado para enviar alerta`);
            return;
        }

        // Criar registro do alerta
        const alert = await this.prisma.technicianAlert.create({
            data: {
                userId,
                ticketId: payload.ticketId,
                type: payload.type,
                message: payload.message,
            },
        });

        // Enviar via Socket.IO (sempre)
        await this.rabbitmq.publishNotification({
            type: 'technician_alert',
            userId,
            alertId: alert.id,
            payload: {
                ...payload,
                userName: user.name,
            },
        });

        // Atualizar flag
        await this.prisma.technicianAlert.update({
            where: { id: alert.id },
            data: { sentViaPush: true },
        });

        console.log(`📢 Alerta Socket.IO enviado para ${user.name}`);

        // Enviar via WhatsApp (se configurado)
        if (user.phoneNumber && user.receiveAlerts) {
            const whatsappMessage = this.formatWhatsAppMessage(payload);

            await this.rabbitmq.publishOutgoingMessage({
                to: user.phoneNumber,
                text: whatsappMessage,
                isAlert: true,
            });

            // Atualizar flag
            await this.prisma.technicianAlert.update({
                where: { id: alert.id },
                data: { sentViaWa: true },
            });

            console.log(`📱 Alerta WhatsApp enviado para ${user.name} (${user.phoneNumber})`);
        }
    }

    /**
     * Enviar alerta para todos os técnicos de um nível
     */
    async sendAlertToLevel(level: 'N1' | 'N2' | 'N3', payload: AlertPayload): Promise<void> {
        const technicians = await this.prisma.user.findMany({
            where: {
                technicianLevel: level,
                active: true,
                receiveAlerts: true,
            },
            select: { id: true },
        });

        console.log(`📢 Enviando alerta para ${technicians.length} técnicos ${level}`);

        // Otimização: Enviar em paralelo para não bloquear o bot por muito tempo
        await Promise.all(technicians.map(tech => this.sendAlertToUser(tech.id, payload)));
    }

    /**
     * Alerta de novo ticket
     */
    async alertNewTicket(ticketId: string, assignedToId: string, ticketData: {
        title: string;
        customerName?: string;
        sector?: string;
        priority: string;
    }): Promise<void> {
        await this.sendAlertToUser(assignedToId, {
            ticketId,
            type: 'NEW_TICKET',
            title: '🎫 Novo Chamado',
            message: `Novo ticket ${ticketId.slice(-6)}: ${ticketData.title}`,
            priority: ticketData.priority,
        });
    }

    /**
     * Alerta de escalonamento
     */
    async alertEscalation(ticketId: string, toLevel: 'N1' | 'N2' | 'N3', ticketData: {
        title: string;
        fromLevel: string;
        elapsed: string;
    }): Promise<void> {
        await this.sendAlertToLevel(toLevel, {
            ticketId,
            type: 'ESCALATED',
            title: '⚠️ Chamado Escalonado',
            message: `Ticket ${ticketId.slice(-6)} escalonado de ${ticketData.fromLevel} para ${toLevel}. Tempo: ${ticketData.elapsed}`,
        });
    }

    /**
     * Alerta de SLA warning (75%)
     */
    async alertSLAWarning(ticketId: string, assignedToId: string, remaining: string): Promise<void> {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { title: true, sector: true, priority: true },
        });

        await this.sendAlertToUser(assignedToId, {
            ticketId,
            type: 'SLA_WARNING',
            title: '⚡ SLA em 75%',
            message: `Ticket ${ticketId.slice(-6)}: ${ticket?.title || 'Sem título'} - SLA em 75%. Tempo restante: ${remaining}`,
            slaRemaining: remaining,
        });
    }

    /**
     * Alerta de SLA breach
     */
    async alertSLABreach(ticketId: string, assignedToId: string): Promise<void> {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            select: { title: true, sector: true, priority: true },
        });

        await this.sendAlertToUser(assignedToId, {
            ticketId,
            type: 'SLA_BREACH',
            title: '🚨 SLA Estourado!',
            message: `SLA estourado no ticket ${ticketId.slice(-6)}: ${ticket?.title || 'Sem título'}. Atenda com urgência.`,
        });
    }

    /**
     * Formatar mensagem para WhatsApp
     */
    private formatWhatsAppMessage(payload: AlertPayload): string {
        const ticketRef = payload.ticketId ? `#${payload.ticketId.slice(-6)}` : '';
        let message = '';

        switch (payload.type) {
            case 'NEW_TICKET':
                message = `🎫 *Novo Chamado ${ticketRef}*\n\n`;
                message += `📋 ${payload.title}\n`;
                if (payload.priority) message += `🔥 Prioridade: ${payload.priority}\n`;
                message += `\nAcesse o painel para atender.`;
                break;

            case 'ESCALATED':
                message = `⚠️ *Chamado Escalonado ${ticketRef}*\n\n`;
                message += `${payload.message}\n`;
                message += `\nAtenda com urgência!`;
                break;

            case 'SLA_WARNING':
                message = `⚡ *Alerta SLA ${ticketRef}*\n\n`;
                message += `O SLA está em 75% do tempo limite!\n`;
                if (payload.slaRemaining) message += `⏰ Tempo restante: ${payload.slaRemaining}\n`;
                message += `\nFinalize ou transfira o chamado.`;
                break;

            case 'SLA_BREACH':
                message = `🚨 *SLA ESTOURADO ${ticketRef}*\n\n`;
                message += `O prazo de SLA foi excedido!\n`;
                message += `\nAtenda IMEDIATAMENTE!`;
                break;

            case 'NEW_MESSAGE':
                message = `💬 *Nova Mensagem ${ticketRef}*\n\n`;
                message += `O cliente enviou uma nova mensagem.\n`;
                message += `\nAcesse o painel para responder.`;
                break;

            case 'TRANSFERRED':
                message = `🔄 *Chamado Transferido ${ticketRef}*\n\n`;
                message += `${payload.message}\n`;
                message += `\nAcesse o painel para detalhes.`;
                break;

            default:
                message = `📢 ${payload.title}\n\n${payload.message}`;
        }

        return message;
    }

    /**
     * Marcar alerta como lido
     */
    async markAsRead(alertId: string): Promise<void> {
        await this.prisma.technicianAlert.update({
            where: { id: alertId },
            data: { readAt: new Date() },
        });
    }

    /**
     * Buscar alertas não lidos de um usuário
     */
    async getUnreadAlerts(userId: string): Promise<any[]> {
        return this.prisma.technicianAlert.findMany({
            where: {
                userId,
                readAt: null,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
}
