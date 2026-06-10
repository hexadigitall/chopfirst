import { getDb } from './database';

export async function getCheapestItemPrice(): Promise<number> {
  const db = getDb();
  const result = await db.query('SELECT MIN(price) as min_price FROM menu_items WHERE available = 1');
  return result.rows[0]?.min_price || 500;
}

export async function checkAndApplyFreeze(userId: string): Promise<{ frozen: boolean; reason?: string }> {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0] as any;
  if (!user) return { frozen: false };

  const tierResult = await db.query('SELECT * FROM tier_limits WHERE tier = $1', [user.tier]);
  const tierLimit = tierResult.rows[0] as any;
  if (!tierLimit) return { frozen: false };

  const cheapestPrice = await getCheapestItemPrice();
  const remainingCredit = tierLimit.credit_cap - user.outstanding_balance;

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
