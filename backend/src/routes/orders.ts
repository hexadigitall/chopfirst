import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { authenticate, requireRealUser } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { v4 as uuid } from 'uuid';
import { checkAndApplyFreeze } from '../helpers';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query(`
    SELECT o.*, m.name as merchant_name, m.location as merchant_location
    FROM orders o JOIN merchants m ON m.id = o.merchant_id
    WHERE o.user_id = $1 ORDER BY o.created_at DESC
  `, [req.user!.id]);
  res.json({ success: true, data: result.rows });
}));

router.get('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  const order = orderResult.rows[0] as any;
  if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
  const itemsResult = await db.query(`
    SELECT oi.*, mi.name, mi.description FROM order_items oi
    JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.order_id = $1
  `, [req.params.id]);
  const txnsResult = await db.query('SELECT * FROM transactions WHERE order_id = $1', [req.params.id]);
  res.json({ success: true, data: { ...order, items: itemsResult.rows, transactions: txnsResult.rows } });
}));

router.post('/', authenticate, requireRealUser, validate(schemas.createOrder), asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { merchantId, items, downPayment } = req.body;

  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  const user = userResult.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

  // Check freeze status based on remaining credit
  const freezeCheck = await checkAndApplyFreeze(user.id);
  if (freezeCheck.frozen) {
    res.status(403).json({ success: false, error: freezeCheck.reason });
    return;
  }

  const merchantResult = await db.query('SELECT * FROM merchants WHERE id = $1 AND is_active = 1', [merchantId]);
  const merchant = merchantResult.rows[0] as any;
  if (!merchant) { res.status(404).json({ success: false, error: 'Merchant not found' }); return; }

  let totalCost = 0;
  const orderItems: any[] = [];
  for (const item of items) {
    const menuResult = await db.query('SELECT * FROM menu_items WHERE id = $1 AND merchant_id = $2 AND available = 1', [item.menuItemId, merchantId]);
    const menuItem = menuResult.rows[0] as any;
    if (!menuItem) { res.status(400).json({ success: false, error: `Menu item ${item.menuItemId} unavailable` }); return; }
    const qty = item.quantity || 1;
    totalCost += menuItem.price * qty;
    orderItems.push({ ...menuItem, quantity: qty });
  }

  if (downPayment > totalCost) {
    res.status(400).json({ success: false, error: 'Down payment exceeds total cost' });
    return;
  }

  const tierResult = await db.query('SELECT * FROM tier_limits WHERE tier = $1', [user.tier]);
  const tierLimit = tierResult.rows[0] as any;

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
    await db.query(
      "INSERT INTO orders (id,user_id,merchant_id,total_cost,down_payment,outstanding,fee,status,due_at) VALUES ($1,$2,$3,$4,$5,0,0,'COMPLETED',$6)",
      [orderId, user.id, merchantId, totalCost, downPayment, dueAt.toISOString()]
    );
    for (const oi of orderItems) {
      await db.query(
        'INSERT INTO order_items (id,order_id,menu_item_id,quantity,unit_price) VALUES ($1,$2,$3,$4,$5)',
        [uuid(), orderId, oi.id, oi.quantity, oi.price]
      );
    }
    const txId = uuid();
    await db.query(
      'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)',
      [txId, orderId, user.id, merchantId, downPayment, 'DOWN_PAYMENT']
    );
    await db.query('UPDATE merchants SET total_prepaid = total_prepaid + 1, total_revenue = total_revenue + $1 WHERE id = $2', [totalCost, merchantId]);
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
  await db.query(
    'INSERT INTO orders (id,user_id,merchant_id,total_cost,down_payment,outstanding,fee,status,due_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [orderId, user.id, merchantId, totalCost, downPayment, outstanding, fee, 'PREPAID', dueAt.toISOString()]
  );

  for (const oi of orderItems) {
    await db.query(
      'INSERT INTO order_items (id,order_id,menu_item_id,quantity,unit_price) VALUES ($1,$2,$3,$4,$5)',
      [uuid(), orderId, oi.id, oi.quantity, oi.price]
    );
  }

  const txDown = uuid(); const txSub = uuid(); const txFee = uuid();
  await db.query('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)', [txDown, orderId, user.id, merchantId, downPayment, 'DOWN_PAYMENT']);
  await db.query('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)', [txSub, orderId, user.id, merchantId, outstanding - fee, 'SUBSIDY']);
  if (fee > 0) await db.query('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)', [txFee, orderId, user.id, merchantId, fee, 'FEE']);

  await db.query('UPDATE users SET outstanding_balance = outstanding_balance + $1, total_subsidized = total_subsidized + $2 WHERE id = $3', [outstanding, outstanding - fee, user.id]);
  await db.query('UPDATE merchants SET total_prepaid = total_prepaid + 1, total_revenue = total_revenue + $1 WHERE id = $2', [totalCost, merchantId]);

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
}));

router.post('/:id/pay', authenticate, requireRealUser, validate(schemas.orderPay), asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  const order = orderResult.rows[0] as any;
  if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
  if (order.status !== 'PREPAID') { res.status(400).json({ success: false, error: 'Order already settled' }); return; }

  const { amount } = req.body;

  const newOutstanding = Math.max(0, order.outstanding - amount);
  const paid = order.outstanding - newOutstanding;
  const txId = uuid();
  await db.query(
    'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)',
    [txId, order.id, order.user_id, order.merchant_id, paid, 'SETTLEMENT']
  );

  if (newOutstanding === 0) {
    await db.query("UPDATE orders SET outstanding = 0, status = $1 WHERE id = $2", ['COMPLETED', order.id]);
    await db.query('UPDATE users SET outstanding_balance = GREATEST(0, outstanding_balance - $1), clean_cycles = clean_cycles + 1 WHERE id = $2', [paid, order.user_id]);
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [order.user_id]);
    const user = userResult.rows[0] as any;
    const nextTierResult = await db.query('SELECT * FROM tier_limits WHERE min_cycles <= $1 ORDER BY min_cycles DESC LIMIT 1', [user.clean_cycles]);
    const nextTier = nextTierResult.rows[0] as any;
    if (nextTier && nextTier.tier !== user.tier) {
      await db.query('UPDATE users SET tier = $1 WHERE id = $2', [nextTier.tier, user.id]);
    }
    await checkAndApplyFreeze(order.user_id);
    res.json({ success: true, data: { status: 'COMPLETED', message: 'Balance fully cleared!' } });
  } else {
    await db.query('UPDATE orders SET outstanding = $1 WHERE id = $2', [newOutstanding, order.id]);
    await db.query('UPDATE users SET outstanding_balance = $1 WHERE id = $2', [newOutstanding, order.user_id]);
    await checkAndApplyFreeze(order.user_id);
    res.json({ success: true, data: { status: 'PARTIAL', outstanding: newOutstanding } });
  }
}));

export default router;
