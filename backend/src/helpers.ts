import { getDb } from './database';

export async function getCheapestItemPrice(): Promise<number> {
  const db = getDb();
  const result = await db.query('SELECT MIN(price) as min_price FROM menu_items WHERE available = 1');
  return result.rows[0]?.min_price || 500;
}

export async function getTotalFeesPaid(userId: string): Promise<number> {
  const db = getDb();
  const result = await db.query(
    'SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = $1 AND type = $2',
    [userId, 'FEE']
  );
  return result.rows[0]?.total || 0;
}

export async function calculateEffectiveCap(tierLimit: { credit_cap: number }, userId: string): Promise<{ effectiveCap: number; breakdown: { baseCap: number; feesBonus: number } }> {
  const totalFees = await getTotalFeesPaid(userId);
  const baseCap = tierLimit.credit_cap;
  const feesBonus = totalFees * 2;
  const velocityLimit = baseCap * 3;
  const effectiveCap = Math.min(baseCap + feesBonus, velocityLimit);
  return { effectiveCap, breakdown: { baseCap, feesBonus } };
}

export async function checkAndApplyFreeze(userId: string): Promise<{ frozen: boolean; reason?: string }> {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0] as any;
  if (!user) return { frozen: false };

  const tierResult = await db.query('SELECT * FROM tier_limits WHERE tier = $1', [user.tier]);
  const tierLimit = tierResult.rows[0] as any;
  if (!tierLimit) return { frozen: false };

  const { effectiveCap } = await calculateEffectiveCap(tierLimit, userId);
  const remainingCredit = effectiveCap - user.outstanding_balance;
  const cheapestPrice = await getCheapestItemPrice();

  if (remainingCredit < cheapestPrice && user.status !== 'FROZEN') {
    await db.query('UPDATE users SET status = $1 WHERE id = $2', ['FROZEN', userId]);
    return {
      frozen: true,
      reason: `Your remaining credit of ₦${remainingCredit.toLocaleString()} is less than the cheapest available item (₦${cheapestPrice.toLocaleString()}). Clear some debt to continue using Chop First.`
    };
  }

  if (remainingCredit >= cheapestPrice && user.status === 'FROZEN') {
    await db.query('UPDATE users SET status = $1 WHERE id = $2', ['ACTIVE', userId]);
    return { frozen: false };
  }

  return {
    frozen: user.status === 'FROZEN',
    reason: user.status === 'FROZEN'
      ? `Your remaining credit (₦${remainingCredit.toLocaleString()}) is too small to purchase any available item (cheapest: ₦${cheapestPrice.toLocaleString()}). Clear some debt to continue.`
      : undefined
  };
}
