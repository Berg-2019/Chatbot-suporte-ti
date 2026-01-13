/**
 * Rotas de Tickets/Chamados
 */

import { Router, Request, Response } from 'express';
import database from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

interface TicketRow {
  id: number;
  customer_phone: string;
  customer_name: string | null;
  sector: string | null;
  ticket_type: string | null;
  location: string | null;
  equipment: string | null;
  patrimony: string | null;
  problem: string | null;
  status: string;
  priority: number;
  queue_id: number | null;
  assigned_to: number | null;
  bot_data: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_name?: string;
  queue_name?: string;
}

/**
 * GET /api/tickets
 * Listar tickets (filtrado por role do usuário)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, queue_id, assigned_to } = req.query;
    const user = req.user!;

    let sql = `
      SELECT t.*, u.name as assigned_name, q.name as queue_name
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN queues q ON t.queue_id = q.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filtrar por status
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    // Filtrar por fila
    if (queue_id) {
      sql += ' AND t.queue_id = ?';
      params.push(queue_id);
    }

    // Filtrar por técnico (se não for admin, só vê os seus)
    if (user.role !== 'admin') {
      sql += ' AND (t.assigned_to = ? OR t.assigned_to IS NULL)';
      params.push(user.id);
    } else if (assigned_to) {
      sql += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    sql += ' ORDER BY t.priority DESC, t.created_at ASC';

    const tickets = await database.all<TicketRow>(sql, params);
    res.json(tickets);
  } catch (error: any) {
    console.error('Erro ao listar tickets:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/tickets/pending
 * Tickets aguardando técnico
 */
router.get('/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tickets = await database.all<TicketRow>(`
      SELECT t.*, q.name as queue_name
      FROM tickets t
      LEFT JOIN queues q ON t.queue_id = q.id
      WHERE t.status = 'waiting' AND t.assigned_to IS NULL
      ORDER BY t.priority DESC, t.created_at ASC
    `);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/tickets/:id
 * Obter ticket por ID
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await database.get<TicketRow>(`
      SELECT t.*, u.name as assigned_name, q.name as queue_name
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN queues q ON t.queue_id = q.id
      WHERE t.id = ?
    `, [id]);

    if (!ticket) {
      res.status(404).json({ error: 'Ticket não encontrado' });
      return;
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/tickets/:id/assign
 * Assumir ticket
 */
router.post('/:id/assign', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    await database.run(
      `UPDATE tickets SET assigned_to = ?, status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [user.id, id]
    );

    res.json({ message: 'Ticket assumido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/tickets/:id/transfer
 * Transferir ticket para outro técnico
 */
router.post('/:id/transfer', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { technician_id, queue_id } = req.body;

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (technician_id) {
      updates.push('assigned_to = ?');
      params.push(technician_id);
    }

    if (queue_id) {
      updates.push('queue_id = ?');
      params.push(queue_id);
    }

    params.push(id);

    await database.run(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Ticket transferido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/tickets/:id/close
 * Fechar ticket
 */
router.post('/:id/close', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await database.run(
      `UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    res.json({ message: 'Ticket fechado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
