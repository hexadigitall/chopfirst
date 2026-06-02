import { Router, Request, Response } from 'express';
import { getDb } from '../database';

const router = Router();

router.get('/metrics', (_req: Request, res: Response) => {
  const db = getDb();

  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const activeUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE status = ?').get('ACTIVE') as any).c;
  const frozenUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE status = ?').get('FROZEN') as any).c;
  const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
  const prepaidOrders = (db.prepare('SELECT COUNT(*) as c FROM orders WHERE status = ?').get('PREPAID') as any).c;
  const totalSubsidy = (db.prepare('SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type = ?').get('SUBSIDY') as any).s;
  const totalRevenue = (db.prepare('SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type = ?').get('DOWN_PAYMENT') as any).s;
  const defaultRate = totalOrders > 0 ? (prepaidOrders / totalOrders * 100) : 0;

  const tierBreakdown = db.prepare('SELECT tier, COUNT(*) as count FROM users GROUP BY tier').all();
  const recentOrders = db.prepare(`
    SELECT o.*, u.name as user_name, m.name as merchant_name
    FROM orders o JOIN users u ON u.id = o.user_id JOIN merchants m ON m.id = o.merchant_id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();
  const dailyRevenue = db.prepare(`
    SELECT date(created_at) as day, SUM(amount) as revenue
    FROM transactions WHERE type IN ('DOWN_PAYMENT','SUBSIDY')
    GROUP BY date(created_at) ORDER BY day DESC LIMIT 14
  `).all();

  res.json({ success: true, data: {
    totalUsers, activeUsers, frozenUsers, totalOrders, prepaidOrders,
    totalSubsidy, totalRevenue, defaultRate: Math.round(defaultRate * 100) / 100,
    tierBreakdown, recentOrders, dailyRevenue
  }});
});

router.get('/users', (_req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, data: users });
});

router.post('/users/:id/freeze', (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  db.prepare('UPDATE users SET status = ?, frozen_at = datetime(\'now\') WHERE id = ?').run(user.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN', req.params.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

router.post('/users/:id/credit', (req: Request, res: Response) => {
  const db = getDb();
  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'Invalid amount' }); return; }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  db.prepare('UPDATE users SET outstanding_balance = MAX(0, outstanding_balance - ?) WHERE id = ?').run(amount, req.params.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

export default router;
