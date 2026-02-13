/**
 * GLPI Sync Service - Sincronização periódica com GLPI
 * Monitora SLAs e dispara alertas/escalonamentos
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { GlpiService } from '../external/glpi.service';
import { AlertService } from './alert.service';
import { TechnicianLevel } from '@prisma/client';

interface SLAConfig {
    warningPercent: number;      // % do SLA para disparar warning (ex: 75%)
    escalateToN2Percent: number; // % do SLA para escalar para N2
    escalateToN3Percent: number; // % do SLA para escalar para N3
}

@Injectable()
export class GlpiSyncService implements OnModuleInit {
    private readonly logger = new Logger(GlpiSyncService.name);

    // Configurações de SLA
    private readonly slaConfig: SLAConfig = {
        warningPercent: 75,
        escalateToN2Percent: 85,
        escalateToN3Percent: 95,
    };

    constructor(
        private prisma: PrismaService,
        private glpi: GlpiService,
        private alerts: AlertService,
    ) { }

    onModuleInit() {
        this.logger.log('✅ GLPI Sync Service inicializado');
        this.logger.log(`   ⚡ Warning em ${this.slaConfig.warningPercent}% do SLA`);
        this.logger.log(`   ⬆️ Escalar N2 em ${this.slaConfig.escalateToN2Percent}%`);
        this.logger.log(`   🔺 Escalar N3 em ${this.slaConfig.escalateToN3Percent}%`);

        // Executar sincronização inicial após 5 segundos (para não bloquear boot)
        setTimeout(() => {
            this.syncRecentTickets();
            this.syncGlpiGroups();
        }, 5000);
    }

    /**
     * Job: Verificar SLAs a cada 5 minutos
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async checkSLAs() {
        this.logger.log('🔍 Verificando SLAs dos tickets...');

        try {
            // Buscar tickets abertos no banco local
            const openTickets = await this.prisma.ticket.findMany({
                where: {
                    status: {
                        notIn: ['CLOSED', 'RESOLVED'],
                    },
                    glpiId: { not: null },
                },
                include: {
                    assignedTo: true,
                },
            });

            this.logger.log(`   📋 ${openTickets.length} tickets abertos encontrados`);

            for (const ticket of openTickets) {
                if (!ticket.glpiId) continue;

                try {
                    // Buscar dados do ticket no GLPI
                    const glpiTicket = await this.glpi.getTicket(ticket.glpiId);

                    if (!glpiTicket) continue;

                    // Calcular progresso do SLA
                    const slaProgress = this.calculateSLAProgress(glpiTicket);

                    if (slaProgress === null) continue;

                    // Processar baseado no progresso
                    await this.processSLAProgress(ticket, glpiTicket, slaProgress);

                } catch (error) {
                    this.logger.warn(`⚠️ Erro ao processar ticket #${ticket.glpiId}: ${error.message}`);
                }
            }

            this.logger.log('✅ Verificação de SLA concluída');
        } catch (error) {
            this.logger.error('❌ Erro na verificação de SLA:', error.message);
        }
    }

    /**
     * Calcular progresso do SLA (0-100%)
     */
    private calculateSLAProgress(glpiTicket: any): number | null {
        const dateCreation = glpiTicket.date_creation;
        const timeToResolve = glpiTicket.time_to_resolve;

        if (!dateCreation || !timeToResolve) {
            return null;
        }

        const created = new Date(dateCreation).getTime();
        const deadline = new Date(timeToResolve).getTime();
        const now = Date.now();

        const totalTime = deadline - created;
        const elapsed = now - created;

        if (totalTime <= 0) return 100;

        const progress = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
        return Math.round(progress);
    }

    /**
     * Processar ticket baseado no progresso do SLA
     */
    private async processSLAProgress(
        ticket: any,
        glpiTicket: any,
        slaProgress: number,
    ) {
        const ticketLevel = this.getCurrentLevel(ticket);

        // SLA estourado (100%+)
        if (slaProgress >= 100) {
            await this.handleSLABreach(ticket, glpiTicket);
            return;
        }

        // Escalar para N3 (95%+)
        if (slaProgress >= this.slaConfig.escalateToN3Percent && ticketLevel !== 'N3') {
            await this.escalateTicket(ticket, glpiTicket, 'N3', slaProgress);
            return;
        }

        // Escalar para N2 (85%+)
        if (slaProgress >= this.slaConfig.escalateToN2Percent && ticketLevel === 'N1') {
            await this.escalateTicket(ticket, glpiTicket, 'N2', slaProgress);
            return;
        }

        // Warning (75%+)
        if (slaProgress >= this.slaConfig.warningPercent) {
            await this.sendSLAWarning(ticket, glpiTicket, slaProgress);
        }
    }

    /**
     * Obter nível atual do ticket baseado no técnico atribuído
     */
    private getCurrentLevel(ticket: any): TechnicianLevel {
        if (!ticket.assignedTo) return 'N1';
        return ticket.assignedTo.technicianLevel || 'N1';
    }

    /**
     * Enviar warning de SLA
     */
    private async sendSLAWarning(ticket: any, glpiTicket: any, progress: number) {
        // Verificar se já enviou warning nas últimas 2 horas
        const recentWarning = await this.prisma.technicianAlert.findFirst({
            where: {
                ticketId: ticket.id,
                type: 'SLA_WARNING',
                createdAt: {
                    gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas
                },
            },
        });

        if (recentWarning) return;

        if (ticket.assignedToId) {
            const remaining = this.formatTimeRemaining(glpiTicket.time_to_resolve);
            await this.alerts.alertSLAWarning(
                ticket.id,
                ticket.glpiId,
                ticket.assignedToId,
                remaining,
            );
            this.logger.warn(`⚡ SLA Warning: Ticket #${ticket.glpiId} em ${progress}%`);
        }
    }

    /**
     * Escalar ticket para próximo nível
     */
    private async escalateTicket(
        ticket: any,
        glpiTicket: any,
        toLevel: TechnicianLevel,
        progress: number,
    ) {
        const fromLevel = this.getCurrentLevel(ticket);

        // Verificar se já escalou nas últimas 4 horas
        const recentEscalation = await this.prisma.technicianAlert.findFirst({
            where: {
                ticketId: ticket.id,
                type: 'ESCALATED',
                createdAt: {
                    gte: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas
                },
            },
        });

        if (recentEscalation) return;

        // Buscar técnico disponível do nível superior
        const availableTech = await this.prisma.user.findFirst({
            where: {
                technicianLevel: toLevel,
                active: true,
                receiveAlerts: true,
            },
            orderBy: {
                // Ordenar por quem tem menos tickets atribuídos
                tickets: { _count: 'asc' },
            },
        });

        if (!availableTech) {
            this.logger.warn(`⚠️ Nenhum técnico ${toLevel} disponível para escalonamento`);
            return;
        }

        // Atualizar ticket no banco local
        await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                assignedToId: availableTech.id,
                escalatedAt: new Date(),
            },
        });

        // Tentar atribuir no GLPI também
        if (availableTech.glpiUserId) {
            try {
                await this.glpi.assignTicketToUser(ticket.glpiId, availableTech.glpiUserId);
            } catch (e) {
                this.logger.warn(`Falha ao atribuir no GLPI: ${e.message}`);
            }
        }

        // Enviar alerta de escalonamento
        const elapsed = this.formatTimeElapsed(glpiTicket.date_creation);
        await this.alerts.alertEscalation(ticket.id, ticket.glpiId, toLevel, {
            title: glpiTicket.name,
            fromLevel,
            elapsed,
        });

        this.logger.warn(`⬆️ Ticket #${ticket.glpiId} escalado de ${fromLevel} para ${toLevel} (${progress}%)`);
    }

    /**
     * Tratar SLA estourado
     */
    private async handleSLABreach(ticket: any, glpiTicket: any) {
        // Verificar se já enviou breach nas últimas 6 horas
        const recentBreach = await this.prisma.technicianAlert.findFirst({
            where: {
                ticketId: ticket.id,
                type: 'SLA_BREACH',
                createdAt: {
                    gte: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas
                },
            },
        });

        if (recentBreach) return;

        if (ticket.assignedToId) {
            await this.alerts.alertSLABreach(ticket.id, ticket.glpiId, ticket.assignedToId);
        }

        // Também alertar N3 e admins
        await this.alerts.sendAlertToLevel('N3', {
            ticketId: ticket.id,
            glpiId: ticket.glpiId,
            type: 'SLA_BREACH',
            title: '🚨 SLA Estourado!',
            message: `Chamado #${ticket.glpiId} estourou o SLA! Atenção urgente necessária.`,
        });

        this.logger.error(`🚨 SLA BREACH: Ticket #${ticket.glpiId} estourou!`);
    }

    /**
     * Formatar tempo restante
     */
    private formatTimeRemaining(deadline: string): string {
        const remaining = new Date(deadline).getTime() - Date.now();

        if (remaining < 0) return 'Estourado';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    }

    /**
     * Formatar tempo decorrido
     */
    private formatTimeElapsed(created: string): string {
        const elapsed = Date.now() - new Date(created).getTime();

        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    }

    /**
     * Sincronizar grupos do GLPI com técnicos locais
     * Executar manualmente ou ao iniciar
     */
    async syncGlpiGroups() {
        this.logger.log('🔄 Sincronizando grupos GLPI...');

        try {
            const groups = await this.glpi.getGroups();

            for (const group of groups) {
                // Mapear grupos para níveis
                let level: TechnicianLevel = 'N1';
                const groupName = group.name?.toLowerCase() || '';

                if (groupName.includes('n2') || groupName.includes('nível 2')) {
                    level = 'N2';
                } else if (groupName.includes('n3') || groupName.includes('nível 3')) {
                    level = 'N3';
                }

                this.logger.log(`   Grupo: ${group.name} → ${level}`);
            }

            this.logger.log('✅ Sincronização de grupos concluída');
        } catch (error) {
            this.logger.error('❌ Erro ao sincronizar grupos:', error.message);
        }
    }
    /**
     * Sincronizar tickets recentes do GLPI (Executar na inicialização e cron)
     * Importa novos tickets que foram criados diretamente no GLPI
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async syncRecentTickets() {
        this.logger.log('🔄 Sincronizando tickets recentes do GLPI...');
        try {
            const adminSession = await this.glpi.getAdminSession();
            // Buscar últimos 50 tickets
            const tickets = await this.glpi.fetchLatestTickets(adminSession, 50);

            let syncedCount = 0;
            let updatedCount = 0;

            for (const t of tickets) {
                // Mapear Status
                let status: any = 'NEW';
                switch (Number(t.status)) {
                    case 1: status = 'NEW'; break; // New
                    case 2: status = 'ASSIGNED'; break; // Processing (assigned)
                    case 3: status = 'IN_PROGRESS'; break; // Processing (planned)
                    case 4: status = 'WAITING_CLIENT'; break; // Pending
                    case 5: status = 'RESOLVED'; break; // Solved
                    case 6: status = 'CLOSED'; break; // Closed
                    default: status = 'NEW';
                }

                // Mapear Prioridade
                let priority: any = 'NORMAL';
                switch (Number(t.priority)) {
                    case 1:
                    case 2: priority = 'LOW'; break;
                    case 3: priority = 'NORMAL'; break;
                    case 4: priority = 'HIGH'; break;
                    case 5:
                    case 6: priority = 'URGENT'; break;
                    default: priority = 'NORMAL';
                }

                const existing = await this.prisma.ticket.findUnique({
                    where: { glpiId: t.id }
                });

                if (!existing) {
                    // Criar novo ticket localmente
                    // Note: content pode ser HTML, e phoneNumber é obrigatório.
                    await this.prisma.ticket.create({
                        data: {
                            glpiId: t.id,
                            title: t.name || 'Sem título',
                            description: t.content ? String(t.content).substring(0, 3000) : '-', // Limitar tamanho
                            status,
                            priority,
                            phoneNumber: '0000000000', // Placeholder para tickets via WEB
                            type: 'SUPPORT',

                            createdAt: new Date(t.date_creation),
                            updatedAt: new Date(t.date_mod)
                        }
                    });
                    syncedCount++;
                } else {
                    // Atualizar se houver mudança de status ou prioridade
                    if (existing.status !== status || existing.priority !== priority) {
                        await this.prisma.ticket.update({
                            where: { id: existing.id },
                            data: {
                                status,
                                priority,
                                updatedAt: new Date()
                            }
                        });
                        updatedCount++;
                    }
                }
            }

            if (syncedCount > 0 || updatedCount > 0) {
                this.logger.log(`✅ Sincronização concluída: ${syncedCount} novos, ${updatedCount} atualizados.`);
            } else {
                this.logger.log('✅ Sincronização concluída (sem alterações).');
            }

            // Encerrar sessão admin
            await this.glpi.killSession(adminSession);

        } catch (error) {
            this.logger.error('❌ Erro na sincronização de tickets:', error.message);
        }
    }
}
