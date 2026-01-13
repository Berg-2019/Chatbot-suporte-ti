/**
 * Middleware de autenticação JWT
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import database from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-aqui';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  skills: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    res.status(401).json({ error: 'Token mal formatado' });
    return;
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    res.status(401).json({ error: 'Token mal formatado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    
    database.get<AuthUser>(
      'SELECT id, email, name, role, skills FROM users WHERE id = ?',
      [decoded.id]
    ).then(user => {
      if (!user) {
        res.status(401).json({ error: 'Usuário não encontrado' });
        return;
      }

      req.user = {
        ...user,
        skills: JSON.parse(user.skills as unknown as string || '[]'),
      };
      next();
    }).catch(() => {
      res.status(401).json({ error: 'Erro ao verificar token' });
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Requer admin.' });
    return;
  }
  next();
}

export function generateToken(userId: number): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}
