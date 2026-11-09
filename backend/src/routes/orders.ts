import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { v4 as uuid } from 'uuid';
import {
  checkAndApplyFreeze,
  getSeedPool,
  getTierLimit,
  getTotalExposure,
  syncUserTier
} from '../helpers';

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

router.post('/', authenticate, validate(schemas.createOrder), asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { merchantId, items, downPayment } = req.body;

  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  const user = userResult.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

  // Freeze guardrail: any overdue balance blocks new orders.
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

  const tierLimit = await getTierLimit(user.tier);
  if (!tierLimit) { res.status(400).json({ success: false, error: 'Tier configuration not found' }); return; }

  const walletAddress = user.wallet_address || `0x${user.id.replace(/[^a-f0-9]/gi, '').padEnd(40, '0').slice(0, 40)}`;
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + Number(tierLimit.window_days));

  if (downPayment === totalCost) {
    // Full payment creates no new subsidy, so caps do not apply — cash orders stay open.
    const orderId = uuid();
    await db.query(
      "INSERT INTO orders (id,user_id,merchant_id,total_cost,down_payment,outstanding,outstanding_naira,wallet_address,fee,status,due_at) VALUES ($1,$2,$3,$4,$5,0,0,$6,0,'COMPLETED',$7)",
      [orderId, user.id, merchantId, totalCost, downPayment, walletAddress, dueAt.toISOString()]
    );
    for (const oi of orderItems) {
      await db.query(
        'INSERT INTO order_items (id,order_id,menu_item_id,quantity,unit_price) VALUES ($1,$2,$3,$4,$5)',
        [uuid(), orderId, oi.id, oi.quantity, oi.price]
      );
    }
    await db.query(
      'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)',
      [uuid(), orderId, user.id, merchantId, downPayment, 'DOWN_PAYMENT']
    );
    await db.query('UPDATE merchants SET total_prepaid = total_prepaid + 1, total_revenue = total_revenue + $1 WHERE id = $2', [totalCost, merchantId]);
    res.json({ success: true, data: { id: orderId, totalCost, downPayment, outstanding: 0, status: 'COMPLETED', fullPayment: true } });
    return;
  }

  const subsidy = totalCost - downPayment;
  const fee = Math.round(subsidy * 0.10 * 100) / 100;
  const outstanding = subsidy + fee;
  const newTotalDebt = Number(user.outstanding_balance) + outstanding;

  if (subsidy > Number(tierLimit.per_order)) {
    const reqDown = Math.max(0, Math.ceil(totalCost - Number(tierLimit.per_order)));
    res.status(400).json({
      success: false,
      error: `Exceeds per-order limit ₦${Number(tierLimit.per_order).toLocaleString()} (this order's subsidy is ₦${subsidy.toLocaleString()}). Increase your down payment or choose cheaper items.`,
      data: { tierLimit: tierLimit.per_order, requiredDown: reqDown }
    });
    return;
  }

  if (newTotalDebt > Number(tierLimit.total_cap)) {
    const room = Math.max(0, Number(tierLimit.total_cap) - Number(user.outstanding_balance));
    res.status(400).json({
      success: false,
      error: `Exceeds total cap ₦${Number(tierLimit.total_cap).toLocaleString()}. This order would take your balance to ₦${newTotalDebt.toLocaleString()}; you can only accrue ₦${room.toLocaleString()} more. Increase down payment or clear existing balance first.`,
      data: { totalCap: tierLimit.total_cap, currentDebt: user.outstanding_balance, maxNewDebt: room }
    });
    return;
  }

  const seedPool = getSeedPool();
  const exposure = await getTotalExposure();
  if (exposure + subsidy > seedPool * 0.85) {
    res.status(503).json({
      success: false,
      error: 'The pilot seed pool is currently at its 85% exposure reserve. Please try again later.'
    });
    return;
  }

  const orderId = uuid();
  await db.query(
    'INSERT INTO orders (id,user_id,merchant_id,total_cost,down_payment,outstanding,outstanding_naira,wallet_address,fee,status,due_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
    [orderId, user.id, merchantId, totalCost, downPayment, outstanding, outstanding, walletAddress, fee, 'PREPAID', dueAt.toISOString()]
  );

  for (const oi of orderItems) {
    await db.query(
      'INSERT INTO order_items (id,order_id,menu_item_id,quantity,unit_price) VALUES ($1,$2,$3,$4,$5)',
      [uuid(), orderId, oi.id, oi.quantity, oi.price]
    );
  }

  const txDown = uuid(); const txSub = uuid(); const txFee = uuid();
  await db.query('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)', [txDown, orderId, user.id, merchantId, downPayment, 'DOWN_PAYMENT']);
  await db.query('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)', [txSub, orderId, user.id, merchantId, subsidy, 'SUBSIDY']);
  if (fee > 0) await db.query('INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)', [txFee, orderId, user.id, merchantId, fee, 'FEE']);

  await db.query('UPDATE users SET outstanding_balance = outstanding_balance + $1, total_subsidized = total_subsidized + $2 WHERE id = $3', [outstanding, subsidy, user.id]);
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
      tierLimit: tierLimit.per_order
    }
  });
}));

router.post('/:id/pay', authenticate, validate(schemas.orderPay), asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
  const order = orderResult.rows[0] as any;
  if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
  if (order.status !== 'PREPAID') { res.status(400).json({ success: false, error: 'Order already settled' }); return; }

  const { amount } = req.body;
  const newOutstanding = Math.max(0, Math.round((Number(order.outstanding) - Number(amount)) * 100) / 100);
  const paid = Math.round((Number(order.outstanding) - newOutstanding) * 100) / 100;

  await db.query(
    'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)',
    [uuid(), order.id, order.user_id, order.merchant_id, paid, 'SETTLEMENT']
  );

  if (newOutstanding <= 0) {
    await db.query("UPDATE orders SET outstanding = 0, outstanding_naira = 0, status = 'COMPLETED' WHERE id = $1", [order.id]);
    const earnedCycle = new Date() <= new Date(order.due_at) ? 1 : 0;
    await db.query(
      'UPDATE users SET outstanding_balance = GREATEST(0, outstanding_balance - $1), clean_cycles = clean_cycles + $2 WHERE id = $3',
      [paid, earnedCycle, order.user_id]
    );
    await syncUserTier(order.user_id);
    await checkAndApplyFreeze(order.user_id);
    res.json({ success: true, data: { status: 'COMPLETED', message: 'Balance fully cleared!' } });
  } else {
    await db.query('UPDATE orders SET outstanding = $1, outstanding_naira = $1 WHERE id = $2', [newOutstanding, order.id]);
    await db.query('UPDATE users SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [paid, order.user_id]);
    await checkAndApplyFreeze(order.user_id);
    res.json({ success: true, data: { status: 'PARTIAL', outstanding: newOutstanding } });
  }
}));

export default router;
