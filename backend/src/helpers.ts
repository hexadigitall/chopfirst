import { getDb } from './database';
import { getTierByCycles } from './tiers';
import { v4 as uuid } from 'uuid';

export function stripPassword(u: any): any {
  if (!u) return u;
  const { password_hash, ...rest } = u;
  return rest;
}

export async function getCheapestItemPrice(): Promise<number> {
  const db = getDb();
  const result = await db.query('SELECT MIN(price) as min_price FROM menu_items WHERE available = 1');
  return result.rows[0]?.min_price || 500;
}

export async function getTierLimit(tierCode: string): Promise<any> {
  const db = getDb();
  const result = await db.query('SELECT * FROM tiers WHERE UPPER(name) = UPPER($1)', [tierCode]);
  return result.rows[0];
}

export async function getTotalExposure(): Promise<number> {
  const db = getDb();
  const result = await db.query('SELECT COALESCE(SUM(outstanding_balance),0) AS exposure FROM users');
  return Number(result.rows[0]?.exposure || 0);
}

export function getSeedPool(): number {
  const value = Number(process.env.SEED_POOL || 1000000);
  return Number.isFinite(value) && value > 0 ? value : 1000000;
}

export async function syncUserTier(userId: string): Promise<any> {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0] as any;
  if (!user) return null;
  const tier = getTierByCycles(Number(user.clean_cycles) || 0);
  if (tier && tier.tier !== user.tier) {
    await db.query('UPDATE users SET tier = $1 WHERE id = $2', [tier.tier, userId]);
    user.tier = tier.tier;
  }
  return user;
}

export async function checkAndApplyFreeze(userId: string): Promise<{ frozen: boolean; reason?: string }> {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0] as any;
  if (!user) return { frozen: false };

  const overdueResult = await db.query(
    `SELECT COALESCE(SUM(outstanding),0) AS overdue
     FROM orders
     WHERE user_id = $1 AND status = 'PREPAID' AND outstanding > 0 AND due_at < NOW()`,
    [userId]
  );
  const overdue = Number(overdueResult.rows[0]?.overdue || 0);
  const shouldFreeze = overdue > 0;

  if (shouldFreeze && user.status !== 'FROZEN') {
    await db.query("UPDATE users SET status = 'FROZEN', frozen_at = NOW() WHERE id = $1", [userId]);
    return {
      frozen: true,
      reason: `Your settlement window has passed with ₦${overdue.toLocaleString()} outstanding. Clear Balance to unlock.`
    };
  }

  if (!shouldFreeze && user.status === 'FROZEN' && Number(user.outstanding_balance) <= 0) {
    await db.query("UPDATE users SET status = 'ACTIVE', frozen_at = NULL WHERE id = $1", [userId]);
    return { frozen: false };
  }

  return {
    frozen: user.status === 'FROZEN',
    reason: user.status === 'FROZEN' ? 'Clear Balance to unlock.' : undefined
  };
}

export async function applySettlement(
  userId: string,
  amount: number,
  type: 'SETTLEMENT' | 'TASK_CREDIT'
): Promise<{ applied: number; fullyCleared: boolean; cyclesAwarded: number; user: any }> {
  const db = getDb();
  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0] as any;
  if (!user) throw new Error('User not found');

  const paid = Math.max(0, Math.min(Number(amount) || 0, Number(user.outstanding_balance) || 0));
  if (paid <= 0) {
    const synced = await syncUserTier(userId);
    await checkAndApplyFreeze(userId);
    return { applied: 0, fullyCleared: Number(user.outstanding_balance) <= 0, cyclesAwarded: 0, user: synced };
  }

  const ordersResult = await db.query(
    "SELECT * FROM orders WHERE user_id = $1 AND status = 'PREPAID' AND outstanding > 0 ORDER BY created_at ASC",
    [userId]
  );
  const orders = ordersResult.rows as any[];

  let remaining = paid;
  let cyclesAwarded = 0;
  const now = new Date();

  for (const order of orders) {
    if (remaining <= 0) break;
    const orderOutstanding = Number(order.outstanding) || 0;
    const payOnOrder = Math.min(remaining, orderOutstanding);
    const newOrderOutstanding = Math.round((orderOutstanding - payOnOrder) * 100) / 100;
    const wallet = order.wallet_address || user.wallet_address || null;

    await db.query(
      'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)',
      [uuid(), order.id, userId, order.merchant_id, payOnOrder, type]
    );

    if (newOrderOutstanding <= 0.005) {
      await db.query(
        "UPDATE orders SET outstanding = 0, outstanding_naira = 0, status = 'COMPLETED', wallet_address = COALESCE(wallet_address, $1) WHERE id = $2",
        [wallet, order.id]
      );
      // A clean cycle is earned only when an order is fully settled inside its window.
      if (now <= new Date(order.due_at)) cyclesAwarded += 1;
    } else {
      await db.query(
        'UPDATE orders SET outstanding = $1, outstanding_naira = $1, wallet_address = COALESCE(wallet_address, $2) WHERE id = $3',
        [newOrderOutstanding, wallet, order.id]
      );
    }

    remaining = Math.round((remaining - payOnOrder) * 100) / 100;
  }

  // If ledger rows are out of sync with the user balance, record the residual
  // against the user so task credit can never leave positive credit behind.
  if (remaining > 0.005) {
    await db.query(
      'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type) VALUES ($1,$2,$3,$4,$5,$6)',
      [uuid(), null, userId, null, remaining, type]
    );
  }

  await db.query(
    'UPDATE users SET outstanding_balance = GREATEST(0, outstanding_balance - $1), clean_cycles = clean_cycles + $2 WHERE id = $3',
    [paid, cyclesAwarded, userId]
  );

  await syncUserTier(userId);
  await checkAndApplyFreeze(userId);

  const refreshedResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const refreshed = refreshedResult.rows[0] as any;

  return {
    applied: paid,
    fullyCleared: Number(refreshed?.outstanding_balance || 0) <= 0,
    cyclesAwarded,
    user: refreshed
  };
}
