import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authenticate } from '../middleware/auth';
import { v4 as uuid } from 'uuid';
import { checkAndApplyFreeze, calculateEffectiveCap } from '../helpers';

const router = Router();

router.get('/me', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  checkAndApplyFreeze(req.user!.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  const tierLimit = db.prepare('SELECT * FROM tier_limits WHERE tier = ?').get(user.tier) as any;
  const effectiveCapData = calculateEffectiveCap(tierLimit, user.id);
  res.json({ success: true, data: { ...user, tierLimit: { ...tierLimit, ...effectiveCapData } } });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, data: user });
});

router.post('/', (req: Request, res: Response) => {
  const { phone, name } = req.body;
  if (!phone || !name) { res.status(400).json({ success: false, error: 'Phone and name required' }); return; }
  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO users (id,phone,name) VALUES (?,?,?)').run(id, phone, name);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json({ success: true, data: user });
});

router.post('/pay', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'Invalid amount' }); return; }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  if (user.outstanding_balance <= 0) { res.status(400).json({ success: false, error: 'No outstanding balance to clear' }); return; }

  const paid = Math.min(amount, user.outstanding_balance);

  // Settle oldest PREPAID orders first
  const prepaidOrders = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at ASC'
  ).all(user.id, 'PREPAID') as any[];

  let remaining = paid;
  for (const order of prepaidOrders) {
    if (remaining <= 0) break;
    const orderDue = order.outstanding;
    const payOnOrder = Math.min(remaining, orderDue);
    const newOrderOutstanding = orderDue - payOnOrder;

    const txId = uuid();
    db.prepare('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES (?,?,?,?,?,?)')
      .run(txId, order.id, user.id, order.merchant_id, payOnOrder, 'SETTLEMENT');

    if (newOrderOutstanding === 0) {
      db.prepare('UPDATE orders SET outstanding = 0, status = ? WHERE id = ?').run('COMPLETED', order.id);
      db.prepare('UPDATE users SET clean_cycles = clean_cycles + 1 WHERE id = ?').run(user.id);
    } else {
      db.prepare('UPDATE orders SET outstanding = ? WHERE id = ?').run(newOrderOutstanding, order.id);
    }
    remaining -= payOnOrder;
  }

  const newOutstanding = Math.max(0, user.outstanding_balance - paid);
  db.prepare('UPDATE users SET outstanding_balance = ? WHERE id = ?').run(newOutstanding, user.id);

  // Check for tier upgrade
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
  const nextTier = db.prepare('SELECT * FROM tier_limits WHERE min_cycles <= ? ORDER BY min_cycles DESC LIMIT 1')
    .get(updatedUser.clean_cycles) as any;
  if (nextTier && nextTier.tier !== updatedUser.tier) {
    db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(nextTier.tier, updatedUser.id);
  }

  // Check if user should be unfrozen after debt reduction
  checkAndApplyFreeze(user.id);

  const refreshed = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
  const tierLimit = db.prepare('SELECT * FROM tier_limits WHERE tier = ?').get(refreshed.tier) as any;
  const effectiveCapData = calculateEffectiveCap(tierLimit, refreshed.id);

  res.json({
    success: true,
    data: { ...refreshed, tierLimit: { ...tierLimit, ...effectiveCapData }, paid, fullyCleared: newOutstanding === 0 }
  });
});

export default router;
