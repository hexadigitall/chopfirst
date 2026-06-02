import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { getCheapestItemPrice } from '../helpers';

const router = Router();

router.get('/info', (_req: Request, res: Response) => {
  const db = getDb();
  const tiers = db.prepare('SELECT * FROM tier_limits ORDER BY min_cycles ASC').all();
  const stats = {
    activeMerchants: (db.prepare('SELECT COUNT(*) as c FROM merchants WHERE is_active = 1').get() as any).c,
    totalMealsServed: (db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c,
    totalSubsidyDispersed: (db.prepare('SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type = ?').get('SUBSIDY') as any).s,
    cheapestItemPrice: getCheapestItemPrice(),
  };
  res.json({ success: true, data: { tiers, stats } });
});

export default router;
