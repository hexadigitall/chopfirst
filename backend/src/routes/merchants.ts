import { Router, Request, Response } from 'express';
import { getDb } from '../database';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const merchants = db.prepare('SELECT * FROM merchants WHERE is_active = 1').all();
  res.json({ success: true, data: merchants });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const merchant = db.prepare('SELECT * FROM merchants WHERE id = ?').get(req.params.id) as any;
  if (!merchant) { res.status(404).json({ success: false, error: 'Merchant not found' }); return; }
  const menu = db.prepare('SELECT * FROM menu_items WHERE merchant_id = ?').all(req.params.id);
  const stats = db.prepare(`
    SELECT COUNT(*) as total_orders, COALESCE(SUM(total_cost),0) as revenue
    FROM orders WHERE merchant_id = ? AND status != 'DISPUTED'
  `).get(req.params.id) as any;
  const recentOrders = db.prepare(`
    SELECT o.*, u.name as user_name FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.merchant_id = ? ORDER BY o.created_at DESC LIMIT 10
  `).all(req.params.id);
  res.json({ success: true, data: { ...merchant, menu, stats, recentOrders } });
});

router.put('/:id/menu/:itemId/toggle', (req: Request, res: Response) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ? AND merchant_id = ?').get(req.params.itemId, req.params.id) as any;
  if (!item) { res.status(404).json({ success: false, error: 'Menu item not found' }); return; }
  db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(item.available ? 0 : 1, req.params.itemId);
  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.itemId);
  res.json({ success: true, data: updated });
});

export default router;
