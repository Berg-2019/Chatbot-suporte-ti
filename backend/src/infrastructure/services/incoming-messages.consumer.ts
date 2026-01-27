import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { PrismaService } from '../database/prisma.service';
import { GlpiService } from '../external/glpi.service';
import { MessagesService } from '../../presentation/controllers/messages/messages.service';

@Injectable()
export class IncomingMessagesConsumer implements OnModuleInit {
    constructor(
        private rabbitmq: RabbitMQService,
        private prisma: PrismaService,
        private glpi: GlpiService,
        private messagesService: MessagesService,
    ) { }

    onModuleInit() {
        this.rabbitmq.consume(
            RabbitMQService.QUEUES.INCOMING_MESSAGES,
            async (data) => {
                console.log('📥 Mensagem recebida do Bot:', data);
                await this.processMessage(data);
            }
        );
    }

    private async processMessage(data: any) {
        const { from, text, messageId } = data;
        const phoneNumber = from.split('@')[0];

        // Verificar se existe um ticket ATIVO para este número
        // (Não queremos reabrir tickets fechados ou criar novos para qualquer coisa aqui,
        // pois o fluxo de criação inicial é pelo Bot -> create_ticket)

        const ticket = await this.prisma.ticket.findFirst({
            where: {
                phoneNumber: from, // ou phoneNumber do banco que pode estar sem @
                status: {
                    notIn: ['CLOSED', 'RESOLVED']
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (ticket) {
            console.log(`✅ Mensagem vinculada ao Ticket #${ticket.id} (GLPI #${ticket.glpiId})`);

            // 1. Salvar mensagem no banco local
            // O serviço de mensagens já envia a notificação via Socket.IO
            const { message: savedMsg, isNew } = await this.messagesService.createFromWhatsApp(
                ticket.id,
                text,
                messageId || 'UNKNOWN_WA_ID'
            );

            if (isNew) {
                console.log(`💾 Mensagem salva: ${savedMsg.id}. Notificação deve ter sido enviada.`);

                // 2. Enviar para GLPI como followup (APENAS SE FOR NOVA)
                if (ticket.glpiId) {
                    try {
                        await this.glpi.addFollowup(ticket.glpiId, {
                            content: `[Cliente] ${text}`
                        });
                    } catch (e) {
                        console.error('Erro ao enviar followup para GLPI:', e.message);
                    }
                }
            } else {
                console.log(`♻️ Mensagem duplicada ignorada para GLPI: ${messageId}`);
            }

            // 3. Notificação via Socket é feita automaticamente pelo MessagesService

        } else {
            console.warn(`⚠️ Mensagem recebida de ${phoneNumber} sem ticket ativo. Ignorando ou deveria abrir menu?`);
            // O Bot já trata isso no fluxo. Se chegou aqui, é porque o bot achou que devia mandar.
            // Mas se não tem ticket no backend, pode ser inconsistência.
            // Idealmente, se não tem ticket, não faz nada (o bot já deve ter tratado ou vai tratar)
        }
    }
}
