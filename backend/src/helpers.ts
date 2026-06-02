import { getDb } from './database';

export function getCheapestItemPrice(): number {
  const db = getDb();
  const row = db.prepare('SELECT MIN(price) as min_price FROM menu_items WHERE available = 1').get() as any;
  return row?.min_price || 500;
}

export function checkAndApplyFreeze(userId: string): { frozen: boolean; reason?: string } {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return { frozen: false };

  const tierLimit = db.prepare('SELECT * FROM tier_limits WHERE tier = ?').get(user.tier) as any;
  if (!tierLimit) return { frozen: false };

  const remainingCredit = tierLimit.credit_cap - user.outstanding_balance;
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
