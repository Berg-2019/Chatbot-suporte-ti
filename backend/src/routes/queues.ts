/**
 * Rotas de Filas
 */

import { Router, Request, Response } from 'express';
import database from '../config/database.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

interface QueueRow {
  id: number;
  name: string;
  description: string | null;
  skills: string;
  created_at: string;
  ticket_count?: number;
}

/**
 * GET /api/queues
 * Listar filas
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const queues = await database.all<QueueRow>(`
      SELECT q.*, 
        (SELECT COUNT(*) FROM tickets t WHERE t.queue_id = q.id AND t.status NOT IN ('closed')) as ticket_count
      FROM queues q
      ORDER BY q.name
    `);

    res.json(queues.map(q => ({
      ...q,
      skills: JSON.parse(q.skills || '[]'),
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/queues
 * Criar fila
 */
router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { name, description, skills = [] } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Nome obrigatório' });
      return;
    }

    const result = await database.run(
      `INSERT INTO queues (name, description, skills) VALUES (?, ?, ?)`,
      [name, description, JSON.stringify(skills)]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      description,
      skills,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * PUT /api/queues/:id
 * Atualizar fila
 */
router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, skills } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (skills) {
      updates.push('skills = ?');
      params.push(JSON.stringify(skills));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Nenhum campo para atualizar' });
      return;
    }

    params.push(id);

    await database.run(
      `UPDATE queues SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Fila atualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * DELETE /api/queues/:id
 * Deletar fila
 */
router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await database.run('DELETE FROM queues WHERE id = ?', [id]);

    res.json({ message: 'Fila deletada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
