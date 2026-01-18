/**
 * Notification Service - Envia notificações proativas via WhatsApp
 */

import { whatsappHandler } from '../handlers/whatsapp-handler.js';

class NotificationService {
    /**
     * Enviar mensagem para um número
     */
    async sendMessage(phoneNumber, message) {
        // Formatar número para JID
        const jid = this.formatToJid(phoneNumber);

        if (!whatsappHandler.isConnected) {
            console.warn('⚠️ WhatsApp não conectado, notificação não enviada');
            return false;
        }

        try {
            await whatsappHandler.sendMessage(jid, message);
            console.log(`📤 Notificação enviada para ${phoneNumber}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao enviar notificação: ${error.message}`);
            return false;
        }
    }

    /**
     * Notificar usuário que técnico assumiu o chamado
     */
    async notifyTicketAssigned(phoneNumber, ticketId, technicianName) {
        const message = `✅ *Ótima notícia!*\n\n` +
            `Seu chamado *#${ticketId}* foi atribuído ao técnico *${technicianName}*.\n\n` +
            `Ele entrará em contato em breve para resolver seu problema.`;

        return this.sendMessage(phoneNumber, message);
    }

    /**
     * Notificar usuário que chamado foi resolvido e pedir avaliação
     */
    async notifyTicketResolved(phoneNumber, ticketId, solution) {
        let message = `🎉 *Seu chamado foi resolvido!*\n\n` +
            `Chamado: *#${ticketId}*\n`;

        if (solution) {
            message += `Solução: ${solution}\n`;
        }

        message += `\n⭐ Por favor, avalie nosso atendimento de *1 a 5*:\n` +
            `_(1 = Ruim, 5 = Excelente)_`;

        return this.sendMessage(phoneNumber, message);
    }

    /**
     * Notificar técnico de novo chamado atribuído
     */
    async notifyTechnicianNewTicket(technicianPhone, ticketId, title, customerPhone) {
        const message = `🎫 *Novo chamado atribuído!*\n\n` +
            `ID: *#${ticketId}*\n` +
            `Título: ${title}\n` +
            `Cliente: ${customerPhone}\n\n` +
            `Acesse o painel para mais detalhes.`;

        return this.sendMessage(technicianPhone, message);
    }

    /**
     * Notificar técnico sobre SLA próximo do limite
     */
    async notifyTechnicianSlaWarning(technicianPhone, ticketId, percentUsed) {
        const message = `⚠️ *Alerta de SLA!*\n\n` +
            `O chamado *#${ticketId}* está com ${percentUsed}% do tempo SLA usado.\n\n` +
            `Por favor, priorize este atendimento.`;

        return this.sendMessage(technicianPhone, message);
    }

    /**
     * Formatar número para JID do WhatsApp
     */
    formatToJid(phone) {
        // Remover caracteres especiais
        const cleaned = phone.replace(/\D/g, '');

        // Se já tem @s.whatsapp.net, retornar como está
        if (phone.includes('@s.whatsapp.net')) {
            return phone;
        }

        return `${cleaned}@s.whatsapp.net`;
    }
}

export const notificationService = new NotificationService();
