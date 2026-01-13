/**
 * Rotas de Mensagens/Chat
 */

import { Router, Request, Response } from 'express';
import database from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import whatsappService from '../services/whatsapp.js';

const router = Router();

interface MessageRow {
  id: number;
  ticket_id: number;
  sender_type: 'customer' | 'bot' | 'technician';
  sender_id: number | null;
  sender_name: string | null;
  content: string;
  message_type: string;
  wa_message_id: string | null;
  created_at: string;
}

/**
 * GET /api/chats/:ticketId/messages
 * Obter mensagens de um ticket
 */
router.get('/:ticketId/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;

    const messages = await database.all<MessageRow>(
      `SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC`,
      [ticketId]
    );

    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/chats/:ticketId/messages
 * Enviar mensagem (técnico responde)
 */
router.post('/:ticketId/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    const user = req.user!;

    if (!content) {
      res.status(400).json({ error: 'Conteúdo obrigatório' });
      return;
    }

    // Buscar ticket para obter telefone do cliente
    const ticket = await database.get<{ customer_phone: string }>(
      'SELECT customer_phone FROM tickets WHERE id = ?',
      [ticketId]
    );

    if (!ticket) {
      res.status(404).json({ error: 'Ticket não encontrado' });
      return;
    }

    // Salvar mensagem no banco
    const result = await database.run(
      `INSERT INTO messages (ticket_id, sender_type, sender_id, sender_name, content, message_type)
       VALUES (?, 'technician', ?, ?, ?, 'text')`,
      [ticketId, user.id, user.name, content]
    );

    // Enviar via WhatsApp
    try {
      await whatsappService.sendMessage(ticket.customer_phone, content);
    } catch (waError) {
      console.error('Erro ao enviar WhatsApp:', waError);
      // Mensagem salva mas não enviada
    }

    res.status(201).json({
      id: result.lastID,
      ticket_id: parseInt(ticketId),
      sender_type: 'technician',
      sender_id: user.id,
      sender_name: user.name,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
