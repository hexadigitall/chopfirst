import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authenticate } from '../middleware/auth';
import { v4 as uuid } from 'uuid';
import { checkAndApplyFreeze } from '../helpers';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const orders = db.prepare(`
    SELECT o.*, m.name as merchant_name, m.location as merchant_location
    FROM orders o JOIN merchants m ON m.id = o.merchant_id
    WHERE o.user_id = ? ORDER BY o.created_at DESC
  `).all(req.user!.id);
  res.json({ success: true, data: orders });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
  if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
  const items = db.prepare(`
    SELECT oi.*, mi.name, mi.description FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.order_id = ?
  `).all(req.params.id);
  const txns = db.prepare('SELECT * FROM transactions WHERE order_id = ?').all(req.params.id);
  res.json({ success: true, data: { ...order, items, transactions: txns } });
});

router.post('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const { merchantId, items, downPayment } = req.body;
  if (!merchantId || !items?.length || downPayment == null) {
    res.status(400).json({ success: false, error: 'merchantId, items, and downPayment required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

  // Check freeze status based on remaining credit
  const freezeCheck = checkAndApplyFreeze(user.id);
  if (freezeCheck.frozen) {
    res.status(403).json({ success: false, error: freezeCheck.reason });
    return;
  }

  const merchant = db.prepare('SELECT * FROM merchants WHERE id = ? AND is_active = 1').get(merchantId) as any;
  if (!merchant) { res.status(404).json({ success: false, error: 'Merchant not found' }); return; }

  let totalCost = 0;
  const orderItems: any[] = [];
  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND merchant_id = ? AND available = 1').get(item.menuItemId, merchantId) as any;
    if (!menuItem) { res.status(400).json({ success: false, error: `Menu item ${item.menuItemId} unavailable` }); return; }
    const qty = item.quantity || 1;
    totalCost += menuItem.price * qty;
    orderItems.push({ ...menuItem, quantity: qty });
  }

  if (downPayment > totalCost) {
    res.status(400).json({ success: false, error: 'Down payment exceeds total cost' });
    return;
  }

  const tierLimit = db.prepare('SELECT * FROM tier_limits WHERE tier = ?').get(user.tier) as any;

  if (downPayment === totalCost) {
    // Full payment — check if cap is fully exhausted
    if (user.outstanding_balance >= tierLimit.credit_cap) {
      res.status(400).json({
        success: false,
        error: `Your total outstanding debt of ₦${user.outstanding_balance.toLocaleString()} has reached your ${user.tier} credit cap of ₦${tierLimit.credit_cap.toLocaleString()}. Clear some balance before ordering.`
      });
      return;
    }
    const orderId = uuid();
    const dueAt = new Date(); dueAt.setDate(dueAt.getDate() + 14);
    db.prepare('INSERT INTO orders (id,user_id,merchant_id,total_cost,down_payment,outstanding,fee,status,due_at) VALUES (?,?,?,?,?,0,0,\'COMPLETED\',?)')
      .run(orderId, user.id, merchantId, totalCost, downPayment, dueAt.toISOString());
    for (const oi of orderItems) {
      db.prepare('INSERT INTO order_items (id,order_id,menu_item_id,quantity,unit_price) VALUES (?,?,?,?,?)')
        .run(uuid(), orderId, oi.id, oi.quantity, oi.price);
    }
    const txId = uuid();
    db.prepare('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES (?,?,?,?,?,?)')
      .run(txId, orderId, user.id, merchantId, downPayment, 'DOWN_PAYMENT');
    db.prepare('UPDATE merchants SET total_prepaid = total_prepaid + 1, total_revenue = total_revenue + ? WHERE id = ?').run(totalCost, merchantId);
    res.json({ success: true, data: { id: orderId, totalCost, downPayment, outstanding: 0, status: 'COMPLETED', fullPayment: true } });
    return;
  }

  const fee = Math.round((totalCost - downPayment) * 0.10 * 100) / 100;
  const outstanding = totalCost - downPayment + fee;
  const newTotalDebt = user.outstanding_balance + outstanding;

  if (outstanding > tierLimit.max_subsidy) {
    const reqDown = Math.ceil(totalCost - tierLimit.max_subsidy + (tierLimit.max_subsidy * 0.10));
    res.status(400).json({
      success: false,
      error: `Subsidy ₦${outstanding.toLocaleString()} exceeds your ${user.tier} per-order limit of ₦${tierLimit.max_subsidy.toLocaleString()}. Increase your down payment or choose cheaper items.`,
      data: { tierLimit: tierLimit.max_subsidy, requiredDown: reqDown }
    });
    return;
  }

  if (newTotalDebt > tierLimit.credit_cap) {
    const room = tierLimit.credit_cap - user.outstanding_balance;
    res.status(400).json({
      success: false,
      error: `This order would push your total debt to ₦${newTotalDebt.toLocaleString()}, exceeding your ${user.tier} credit cap of ₦${tierLimit.credit_cap.toLocaleString()}. You can only accrue ₦${room.toLocaleString()} more. Increase down payment or clear existing debt first.`,
      data: { creditCap: tierLimit.credit_cap, currentDebt: user.outstanding_balance, maxNewDebt: room }
    });
    return;
  }

  const orderId = uuid();
  const dueAt = new Date(); dueAt.setDate(dueAt.getDate() + tierLimit.window_days);
  db.prepare('INSERT INTO orders (id,user_id,merchant_id,total_cost,down_payment,outstanding,fee,status,due_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(orderId, user.id, merchantId, totalCost, downPayment, outstanding, fee, 'PREPAID', dueAt.toISOString());

  for (const oi of orderItems) {
    db.prepare('INSERT INTO order_items (id,order_id,menu_item_id,quantity,unit_price) VALUES (?,?,?,?,?)')
      .run(uuid(), orderId, oi.id, oi.quantity, oi.price);
  }

  const txDown = uuid(); const txSub = uuid(); const txFee = uuid();
  db.prepare('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES (?,?,?,?,?,?)').run(txDown, orderId, user.id, merchantId, downPayment, 'DOWN_PAYMENT');
  db.prepare('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES (?,?,?,?,?,?)').run(txSub, orderId, user.id, merchantId, outstanding - fee, 'SUBSIDY');
  if (fee > 0) db.prepare('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES (?,?,?,?,?,?)').run(txFee, orderId, user.id, merchantId, fee, 'FEE');

  db.prepare('UPDATE users SET outstanding_balance = outstanding_balance + ?, total_subsidized = total_subsidized + ? WHERE id = ?').run(outstanding, outstanding - fee, user.id);
  db.prepare('UPDATE merchants SET total_prepaid = total_prepaid + 1, total_revenue = total_revenue + ? WHERE id = ?').run(totalCost, merchantId);

  res.status(201).json({
    success: true,
    data: {
      id: orderId,
      totalCost,
      downPayment,
      outstanding,
      fee,
      dueAt,
      merchantName: merchant.name,
      items: orderItems,
      tier: user.tier,
      tierLimit: tierLimit.max_subsidy
    }
  });
});

router.post('/:id/pay', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
  if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
  if (order.status !== 'PREPAID') { res.status(400).json({ success: false, error: 'Order already settled' }); return; }

  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'Invalid amount' }); return; }

  const newOutstanding = Math.max(0, order.outstanding - amount);
  const paid = order.outstanding - newOutstanding;
  const txId = uuid();
  db.prepare('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES (?,?,?,?,?,?)')
    .run(txId, order.id, order.user_id, order.merchant_id, paid, 'SETTLEMENT');

  if (newOutstanding === 0) {
    db.prepare('UPDATE orders SET outstanding = 0, status = ? WHERE id = ?').run('COMPLETED', order.id);
    db.prepare('UPDATE users SET outstanding_balance = MAX(0, outstanding_balance - ?), clean_cycles = clean_cycles + 1 WHERE id = ?')
      .run(paid, order.user_id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id) as any;
    const nextTier = db.prepare('SELECT * FROM tier_limits WHERE min_cycles <= ? ORDER BY min_cycles DESC LIMIT 1').get(user.clean_cycles) as any;
    if (nextTier && nextTier.tier !== user.tier) {
      db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(nextTier.tier, user.id);
    }
    // Check if they should be unfrozen after debt reduction
    checkAndApplyFreeze(order.user_id);
    res.json({ success: true, data: { status: 'COMPLETED', message: 'Balance fully cleared!' } });
  } else {
    db.prepare('UPDATE orders SET outstanding = ? WHERE id = ?').run(newOutstanding, order.id);
    db.prepare('UPDATE users SET outstanding_balance = ? WHERE id = ?').run(newOutstanding, order.user_id);
    // Check freeze after partial payment too
    checkAndApplyFreeze(order.user_id);
    res.json({ success: true, data: { status: 'PARTIAL', outstanding: newOutstanding } });
  }
});

export default router;
