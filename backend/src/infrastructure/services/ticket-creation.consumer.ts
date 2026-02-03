
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { PrismaService } from '../database/prisma.service';
import { GlpiService } from '../external/glpi.service';
import { AlertService } from './alert.service';

@Injectable()
export class TicketCreationConsumer implements OnModuleInit {
    private readonly logger = new Logger(TicketCreationConsumer.name);

    constructor(
        private rabbitmq: RabbitMQService,
        private prisma: PrismaService,
        private glpi: GlpiService,
        private alertService: AlertService,
    ) { }

    onModuleInit() {
        this.rabbitmq.consume(
            RabbitMQService.QUEUES.CREATE_TICKET,
            async (data) => {
                this.logger.log(`📥 Processando criação de ticket: ${JSON.stringify(data)}`);
                await this.processTicketCreation(data);
            }
        );
    }

    private async processTicketCreation(data: any) {
        let ticketId = data.localTicketId;
        const { phoneNumber, title, description, category, sector, customerName } = data;

        // 1. Se não veio ID local (veio do Bot ou fila direta), criar no banco local primeiro
        if (!ticketId) {
            try {
                const newTicket = await this.prisma.ticket.create({
                    data: {
                        phoneNumber,
                        title,
                        description,
                        category: category || 'Suporte',
                        sector: sector || 'Geral',
                        customerName: customerName || 'Cliente',
                        status: 'NEW',
                        priority: 'NORMAL',
                    },
                });
                ticketId = newTicket.id;
                this.logger.log(`✅ Ticket local criado via RabbitMQ: #${ticketId}`);

                // Notificar painel que um novo ticket chegou (apenas se criado aqui)
                await this.rabbitmq.publishNotification({
                    type: 'ticket_created',
                    ticketId: newTicket.id,
                    payload: newTicket,
                });

                // AVISA TÉCNICOS N1 sobre novo chamado
                await this.alertService.sendAlertToLevel('N1', {
                    ticketId: newTicket.id,
                    type: 'NEW_TICKET',
                    title: '🎫 Novo Chamado Criado',
                    message: `Novo chamado (Bot): ${newTicket.title}\nCliente: ${newTicket.customerName || 'N/A'}\nSetor: ${newTicket.sector || 'N/A'}`,
                    priority: newTicket.priority,
                });

            } catch (error) {
                this.logger.error(`❌ Erro ao criar ticket local: ${error.message}`);
                // Se falhar aqui, não tem como prosseguir para GLPI sem vinculo
                return;
            }
        } else {
            // Se já veio com ticketId (criado via API/Painel), precisamos notificar também?
            // Geralmente se criado pelo painel, já está lá. Mas se criado pelo BotController diretamente e passado pra cá?
            // O BotController cria o Ticket e NÃO chama o RabbitMQ CREATE_TICKET?
            // Vamos verificar quem chama CREATE_TICKET.
            // TicketsService.create chama CREATE_TICKET.
        }

        // 2. Criar no GLPI
        if (ticketId) {
            try {
                // Verificar se já tem GLPI ID (caso mensagem duplicada)
                const existingTicket = await this.prisma.ticket.findUnique({
                    where: { id: ticketId },
                });

                if (existingTicket && existingTicket.glpiId) {
                    this.logger.warn(`⚠️ Ticket #${ticketId} já possui GLPI ID: ${existingTicket.glpiId}. Ignorando criação.`);
                    return;
                }

                // Criar no GLPI
                // Mapear prioridade/urgencia se necessário
                const glpiPayload = {
                    name: title,
                    content: `[Cliente: ${customerName || 'N/A'}]\n[Telefone: ${phoneNumber}]\n\n${description}`,
                    type: 1, // Incidente
                    urgency: 3, // Média
                    // TODO: Mapear categoria se possível
                };

                const glpiId = await this.glpi.createTicket(glpiPayload);
                this.logger.log(`✅ Ticket criado no GLPI: #${glpiId}`);

                // 3. Atualizar ticket local com e ID do GLPI
                const updatedTicket = await this.prisma.ticket.update({
                    where: { id: ticketId },
                    data: { glpiId },
                });

                // Notificar painel (novamente) para atualizar o ID do GLPI na tela
                await this.rabbitmq.publishNotification({
                    type: 'ticket_updated',
                    ticketId: updatedTicket.id,
                    payload: updatedTicket,
                });

                // Se já não alertou antes (fluxo local), alertar agora com o ID do GLPI?
                // Acho melhor alertar logo na criação local para agilidade.
                // Mas enviar um update "Gerado GLPI #1234" pode ser spam.
                // Vou manter apenas o alerta na criação do local ticket acima.

            } catch (error) {
                this.logger.error(`❌ Erro ao criar ticket no GLPI: ${error.message}`);
                // Não falhar o processamento, pois o ticket local já existe. 
                // Um worker de sincronia poderia tentar novamente depois?
            }
        }
    }
}
