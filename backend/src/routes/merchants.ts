import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query('SELECT * FROM merchants WHERE is_active = 1');
  res.json({ success: true, data: result.rows });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const merchantResult = await db.query('SELECT * FROM merchants WHERE id = $1', [req.params.id]);
  const merchant = merchantResult.rows[0] as any;
  if (!merchant) { res.status(404).json({ success: false, error: 'Merchant not found' }); return; }
  const menuResult = await db.query('SELECT * FROM menu_items WHERE merchant_id = $1', [req.params.id]);
  const statsResult = await db.query(`
    SELECT COUNT(*)::int as total_orders, COALESCE(SUM(total_cost),0) as revenue
    FROM orders WHERE merchant_id = $1 AND status != 'DISPUTED'
  `, [req.params.id]);
  const recentResult = await db.query(`
    SELECT o.*, u.name as user_name FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.merchant_id = $1 ORDER BY o.created_at DESC LIMIT 10
  `, [req.params.id]);
  res.json({ success: true, data: { ...merchant, menu: menuResult.rows, stats: statsResult.rows[0], recentOrders: recentResult.rows } });
}));

router.put('/:id/menu/:itemId/toggle', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const itemResult = await db.query('SELECT * FROM menu_items WHERE id = $1 AND merchant_id = $2', [req.params.itemId, req.params.id]);
  const item = itemResult.rows[0] as any;
  if (!item) { res.status(404).json({ success: false, error: 'Menu item not found' }); return; }
  await db.query('UPDATE menu_items SET available = $1 WHERE id = $2', [item.available ? 0 : 1, req.params.itemId]);
  const updatedResult = await db.query('SELECT * FROM menu_items WHERE id = $1', [req.params.itemId]);
  res.json({ success: true, data: updatedResult.rows[0] });
}));

export default router;
