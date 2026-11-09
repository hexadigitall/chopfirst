-- Chop First — 5-tier limits + dual ledger migration
-- Safe to run in the Supabase SQL Editor before deploying.

CREATE TABLE IF NOT EXISTS tiers (
  name TEXT PRIMARY KEY,
  min_cycles INTEGER NOT NULL,
  max_cycles INTEGER NOT NULL,
  per_order DOUBLE PRECISION NOT NULL,
  total_cap DOUBLE PRECISION NOT NULL,
  window_days INTEGER NOT NULL
);

DELETE FROM tiers;
INSERT INTO tiers (name, min_cycles, max_cycles, per_order, total_cap, window_days) VALUES
  ('Unverified', 0, 9, 2500, 5000, 7),
  ('Verified',   10, 19, 10000, 30000, 14),
  ('Trusted',    20, 29, 15000, 50000, 14),
  ('Advanced',   30, 39, 20000, 100000, 14),
  ('Community',  40, 999, 25000, 150000, 14);

-- Every order keeps both the NGN outstanding value and a wallet placeholder.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS outstanding_naira DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wallet_address TEXT;
UPDATE orders SET outstanding_naira = outstanding WHERE outstanding_naira IS NULL;
UPDATE orders o
SET wallet_address = u.wallet_address
FROM users u
WHERE u.id = o.user_id AND o.wallet_address IS NULL;

-- Keep demo users aligned with the new tier ranges.
UPDATE users SET clean_cycles = 1,  tier = 'UNVERIFIED' WHERE phone = '+2348010000001';
UPDATE users SET clean_cycles = 25, tier = 'TRUSTED'    WHERE phone = '+2348010000002';
UPDATE users SET clean_cycles = 42, tier = 'COMMUNITY'  WHERE phone = '+2348010000003';
UPDATE users SET clean_cycles = 15, tier = 'VERIFIED'   WHERE phone = '+2348010000004';
UPDATE users SET clean_cycles = 12, tier = 'VERIFIED'   WHERE phone = '+2348010000005';
