/**
 * Rotas de Usuários/Técnicos
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import database from '../config/database.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  skills: string;
  online: number;
  created_at: string;
}

/**
 * GET /api/users
 * Listar usuários
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await database.all<UserRow>(
      `SELECT id, email, name, role, skills, online, created_at FROM users ORDER BY name`
    );

    res.json(users.map(u => ({
      ...u,
      skills: JSON.parse(u.skills || '[]'),
      online: !!u.online,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/users/technicians
 * Listar apenas técnicos
 */
router.get('/technicians', authMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await database.all<UserRow>(
      `SELECT id, email, name, role, skills, online FROM users WHERE role IN ('technician', 'admin') ORDER BY name`
    );

    res.json(users.map(u => ({
      ...u,
      skills: JSON.parse(u.skills || '[]'),
      online: !!u.online,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/users/:id
 * Obter usuário por ID
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await database.get<UserRow>(
      `SELECT id, email, name, role, skills, online, created_at FROM users WHERE id = ?`,
      [id]
    );

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({
      ...user,
      skills: JSON.parse(user.skills || '[]'),
      online: !!user.online,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * PUT /api/users/:id
 * Atualizar usuário
 */
router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, skills, password } = req.body;

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (skills) {
      updates.push('skills = ?');
      params.push(JSON.stringify(skills));
    }

    if (password) {
      updates.push('password = ?');
      params.push(await bcrypt.hash(password, 10));
    }

    params.push(id);

    await database.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Usuário atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * DELETE /api/users/:id
 * Deletar usuário
 */
router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Não permitir deletar a si mesmo
    if (req.user?.id === parseInt(id)) {
      res.status(400).json({ error: 'Não pode deletar a si mesmo' });
      return;
    }

    await database.run('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'Usuário deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
