import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Missing x-user-id header' });
      return;
    }
    const db = getDb();
    const result = await db.query('SELECT id, tier FROM users WHERE id = $1', [userId]);
    const user = result.rows[0] as { id: string; tier: string } | undefined;
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    req.user = { id: user.id, role: user.tier === 'ADMIN' ? 'admin' : 'user' };
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      const db = getDb();
      const result = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
      const user = result.rows[0] as { id: string } | undefined;
      if (user) req.user = { id: user.id, role: 'user' };
    }
    next();
  } catch (err) {
    next(err);
  }
}
