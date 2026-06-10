import { getDb } from './database';

export function getCheapestItemPrice(): number {
  const db = getDb();
  const row = db.prepare('SELECT MIN(price) as min_price FROM menu_items WHERE available = 1').get() as any;
  return row?.min_price || 500;
}

export function getTotalFeesPaid(userId: string): number {
  const db = getDb();
  const row = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND type = ?').get(userId, 'FEE') as any;
  return row?.total || 0;
}

export function calculateEffectiveCap(tierLimit: { credit_cap: number }, userId: string): { effectiveCap: number; breakdown: { baseCap: number; feesBonus: number } } {
  const totalFees = getTotalFeesPaid(userId);
  const baseCap = tierLimit.credit_cap;
  const feesBonus = totalFees * 2;
  const velocityLimit = baseCap * 3;
  const effectiveCap = Math.min(baseCap + feesBonus, velocityLimit);
  return { effectiveCap, breakdown: { baseCap, feesBonus } };
}

export function checkAndApplyFreeze(userId: string): { frozen: boolean; reason?: string } {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return { frozen: false };

  const tierLimit = db.prepare('SELECT * FROM tier_limits WHERE tier = ?').get(user.tier) as any;
  if (!tierLimit) return { frozen: false };

  const { effectiveCap } = calculateEffectiveCap(tierLimit, userId);
  const remainingCredit = effectiveCap - user.outstanding_balance;
  const cheapestPrice = getCheapestItemPrice();

  if (remainingCredit < cheapestPrice && user.status !== 'FROZEN') {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('FROZEN', userId);
    return {
      frozen: true,
      reason: `Your remaining credit of ₦${remainingCredit.toLocaleString()} is less than the cheapest available item (₦${cheapestPrice.toLocaleString()}). Clear some debt to continue using Chop First.`
    };
  }

  if (remainingCredit >= cheapestPrice && user.status === 'FROZEN') {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('ACTIVE', userId);
    return { frozen: false };
  }

  return {
    frozen: user.status === 'FROZEN',
    reason: user.status === 'FROZEN'
      ? `Your remaining credit (₦${remainingCredit.toLocaleString()}) is too small to purchase any available item (cheapest: ₦${cheapestPrice.toLocaleString()}). Clear some debt to continue.`
      : undefined
  };
}
