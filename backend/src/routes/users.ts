import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { authenticate } from '../middleware/auth';
import { v4 as uuid } from 'uuid';
import { checkAndApplyFreeze, calculateEffectiveCap } from '../helpers';

const router = Router();

router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  await checkAndApplyFreeze(req.user!.id);
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  const tierResult = await db.query('SELECT * FROM tier_limits WHERE tier = $1', [user.tier]);
  const tierLimit = tierResult.rows[0] as any;
  const effectiveCapData = await calculateEffectiveCap(tierLimit, user.id);
  res.json({ success: true, data: { ...user, tierLimit: { ...tierLimit, ...effectiveCapData } } });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, data: user });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { phone, name } = req.body;
  if (!phone || !name) { res.status(400).json({ success: false, error: 'Phone and name required' }); return; }
  const db = getDb();
  const id = uuid();
  await db.query('INSERT INTO users (id,phone,name) VALUES ($1,$2,$3)', [id, phone, name]);
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  const user = result.rows[0];
  res.status(201).json({ success: true, data: user });
}));

router.post('/pay', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'Invalid amount' }); return; }

  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  const user = userResult.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  if (user.outstanding_balance <= 0) { res.status(400).json({ success: false, error: 'No outstanding balance to clear' }); return; }

  const paid = Math.min(amount, user.outstanding_balance);

  // Settle oldest PREPAID orders first
  const ordersResult = await db.query(
    'SELECT * FROM orders WHERE user_id = $1 AND status = $2 ORDER BY created_at ASC',
    [user.id, 'PREPAID']
  );
  const prepaidOrders = ordersResult.rows as any[];

  let remaining = paid;
  for (const order of prepaidOrders) {
    if (remaining <= 0) break;
    const orderDue = order.outstanding;
    const payOnOrder = Math.min(remaining, orderDue);
    const newOrderOutstanding = orderDue - payOnOrder;

    const txId = uuid();
    await db.query(
      'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)',
      [txId, order.id, user.id, order.merchant_id, payOnOrder, 'SETTLEMENT']
    );

    if (newOrderOutstanding === 0) {
      await db.query('UPDATE orders SET outstanding = 0, status = $1 WHERE id = $2', ['COMPLETED', order.id]);
      await db.query('UPDATE users SET clean_cycles = clean_cycles + 1 WHERE id = $1', [user.id]);
    } else {
      await db.query('UPDATE orders SET outstanding = $1 WHERE id = $2', [newOrderOutstanding, order.id]);
    }
    remaining -= payOnOrder;
  }

  const newOutstanding = Math.max(0, user.outstanding_balance - paid);
  await db.query('UPDATE users SET outstanding_balance = $1 WHERE id = $2', [newOutstanding, user.id]);

  // Check for tier upgrade
  const updatedResult = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
  const updatedUser = updatedResult.rows[0] as any;
  const nextTierResult = await db.query(
    'SELECT * FROM tier_limits WHERE min_cycles <= $1 ORDER BY min_cycles DESC LIMIT 1',
    [updatedUser.clean_cycles]
  );
  const nextTier = nextTierResult.rows[0] as any;
  if (nextTier && nextTier.tier !== updatedUser.tier) {
    await db.query('UPDATE users SET tier = $1 WHERE id = $2', [nextTier.tier, updatedUser.id]);
  }

  // Check if user should be unfrozen after debt reduction
  await checkAndApplyFreeze(user.id);

  const refreshedResult = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
  const refreshed = refreshedResult.rows[0] as any;
  const tierLimitResult = await db.query('SELECT * FROM tier_limits WHERE tier = $1', [refreshed.tier]);
  const tierLimit = tierLimitResult.rows[0] as any;
  const effectiveCapData = await calculateEffectiveCap(tierLimit, refreshed.id);

  res.json({
    success: true,
    data: { ...refreshed, tierLimit: { ...tierLimit, ...effectiveCapData }, paid, fullyCleared: newOutstanding === 0 }
  });
}));

export default router;
