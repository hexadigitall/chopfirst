import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { stripPassword } from '../helpers';

const router = Router();

router.get('/metrics', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();

  const totalUsers = (await db.query("SELECT COUNT(*)::int as c FROM users")).rows[0].c;
  const activeUsers = (await db.query("SELECT COUNT(*)::int as c FROM users WHERE status = $1", ['ACTIVE'])).rows[0].c;
  const frozenUsers = (await db.query("SELECT COUNT(*)::int as c FROM users WHERE status = $1", ['FROZEN'])).rows[0].c;
  const totalOrders = (await db.query("SELECT COUNT(*)::int as c FROM orders")).rows[0].c;
  const prepaidOrders = (await db.query("SELECT COUNT(*)::int as c FROM orders WHERE status = $1", ['PREPAID'])).rows[0].c;
  const totalSubsidy = (await db.query("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type = $1", ['SUBSIDY'])).rows[0].s;
  const totalRevenue = (await db.query("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type = $1", ['DOWN_PAYMENT'])).rows[0].s;
  const defaultRate = totalOrders > 0 ? (prepaidOrders / totalOrders * 100) : 0;

  const tierBreakdown = (await db.query('SELECT tier, COUNT(*)::int as count FROM users GROUP BY tier')).rows;
  const recentOrders = (await db.query(`
    SELECT o.*, u.name as user_name, m.name as merchant_name
    FROM orders o JOIN users u ON u.id = o.user_id JOIN merchants m ON m.id = o.merchant_id
    ORDER BY o.created_at DESC LIMIT 10
  `)).rows;
  const dailyRevenue = (await db.query(`
    SELECT created_at::date as day, SUM(amount) as revenue
    FROM transactions WHERE type IN ('DOWN_PAYMENT','SUBSIDY')
    GROUP BY date(created_at) ORDER BY day DESC LIMIT 14
  `)).rows;

  res.json({ success: true, data: {
    totalUsers, activeUsers, frozenUsers, totalOrders, prepaidOrders,
    totalSubsidy, totalRevenue, defaultRate: Math.round(defaultRate * 100) / 100,
    tierBreakdown, recentOrders, dailyRevenue
  }});
}));

router.get('/users', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows.map(stripPassword) });
}));

router.post('/users/:id/freeze', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  const newStatus = user.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
  await db.query("UPDATE users SET status = $1, frozen_at = NOW() WHERE id = $2", [newStatus, req.params.id]);
  const updatedResult = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true, data: stripPassword(updatedResult.rows[0]) });
}));

router.post('/users/:id/credit', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'Invalid amount' }); return; }
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  await db.query('UPDATE users SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [amount, req.params.id]);
  const updatedResult = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true, data: stripPassword(updatedResult.rows[0]) });
}));

export default router;
