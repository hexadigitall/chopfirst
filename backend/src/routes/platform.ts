import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { getCheapestItemPrice } from '../helpers';

const router = Router();

router.get('/info', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  const tiersResult = await db.query('SELECT * FROM tier_limits ORDER BY min_cycles ASC');
  const statsResult = await db.query("SELECT COUNT(*)::int as c FROM merchants WHERE is_active = 1");
  const ordersResult = await db.query("SELECT COUNT(*)::int as c FROM orders");
  const subsidyResult = await db.query("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type = $1", ['SUBSIDY']);
  const stats = {
    activeMerchants: statsResult.rows[0].c,
    totalMealsServed: ordersResult.rows[0].c,
    totalSubsidyDispersed: subsidyResult.rows[0].s,
    cheapestItemPrice: await getCheapestItemPrice(),
  };
  res.json({ success: true, data: { tiers: tiersResult.rows, stats } });
}));

export default router;
