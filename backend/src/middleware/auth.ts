import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Missing x-user-id header' });
    return;
  }
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    res.status(401).json({ success: false, error: 'User not found' });
    return;
  }
  req.user = { id: user.id, role: user.id === 'admin' ? 'admin' : 'user' };
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
    if (user) req.user = { id: user.id, role: 'user' };
  }
  next();
}
