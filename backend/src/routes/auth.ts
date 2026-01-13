/**
 * Rotas de autenticação
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import database from '../config/database.js';
import { authMiddleware, generateToken, AuthUser } from '../middleware/auth.js';

const router = Router();

interface UserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  skills: string;
}

/**
 * POST /api/auth/login
 * Login de usuário
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const user = await database.get<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Marcar como online
    await database.run('UPDATE users SET online = 1 WHERE id = ?', [user.id]);

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        skills: JSON.parse(user.skills || '[]'),
      },
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * POST /api/auth/logout
 * Logout de usuário
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await database.run('UPDATE users SET online = 0 WHERE id = ?', [req.user.id]);
    }
    res.json({ message: 'Logout realizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * GET /api/auth/me
 * Dados do usuário logado
 */
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/register (admin only)
 * Registrar novo técnico
 */
router.post('/register', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Apenas admins podem criar usuários' });
      return;
    }

    const { email, password, name, role = 'technician', skills = [] } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
      return;
    }

    const existing = await database.get<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing) {
      res.status(400).json({ error: 'Email já cadastrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await database.run(
      `INSERT INTO users (email, password, name, role, skills) VALUES (?, ?, ?, ?, ?)`,
      [email, hashedPassword, name, role, JSON.stringify(skills)]
    );

    res.status(201).json({
      message: 'Usuário criado',
      user: { id: result.lastID, email, name, role, skills },
    });
  } catch (error: any) {
    console.error('Erro ao registrar:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
