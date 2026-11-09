import 'dotenv/config';
import { Pool } from 'pg';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { ensureTiers, seed } from './seed';

let pool: Pool;

export function getDb(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Add it in Vercel dashboard → Settings → Environment Variables.');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const db = getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK(tier IN ('UNVERIFIED','VERIFIED','COMMUNITY','ADMIN')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','FROZEN','SUSPENDED')),
      clean_cycles INTEGER NOT NULL DEFAULT 0,
      outstanding_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_subsidized DOUBLE PRECISION NOT NULL DEFAULT 0,
      wallet_address TEXT,
      kind_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      frozen_at TIMESTAMP
    )
  `);

  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);
  await db.query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`).catch(() => {});
  await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check`);
  await db.query(`ALTER TABLE users ADD CONSTRAINT users_tier_check CHECK (tier IN ('UNVERIFIED','VERIFIED','TRUSTED','ADVANCED','COMMUNITY','ADMIN'))`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      total_prepaid INTEGER NOT NULL DEFAULT 0,
      total_revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      name TEXT NOT NULL,
      description TEXT,
      price DOUBLE PRECISION NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'Meal',
      image TEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      total_cost DOUBLE PRECISION NOT NULL,
      down_payment DOUBLE PRECISION NOT NULL,
      outstanding DOUBLE PRECISION NOT NULL,
      outstanding_naira DOUBLE PRECISION,
      wallet_address TEXT,
      fee DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'PREPAID' CHECK(status IN ('PREPAID','COMPLETED','DISPUTED')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      due_at TIMESTAMP NOT NULL
    )
  `);

  // Dual ledger: keep both the NGN outstanding value and a wallet placeholder on every order.
  await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS outstanding_naira DOUBLE PRECISION`).catch(() => {});
  await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS wallet_address TEXT`).catch(() => {});
  await db.query(`UPDATE orders SET outstanding_naira = outstanding WHERE outstanding_naira IS NULL`).catch(() => {});
  await db.query(`
    UPDATE orders o SET wallet_address = u.wallet_address
    FROM users u WHERE u.id = o.user_id AND o.wallet_address IS NULL
  `).catch(() => {});

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DOUBLE PRECISION NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      merchant_id TEXT REFERENCES merchants(id),
      amount DOUBLE PRECISION NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('DOWN_PAYMENT','SUBSIDY','SETTLEMENT','TASK_CREDIT','FEE')),
      status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('PENDING','COMPLETED','FAILED')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('PLATFORM','MERCHANT','COMMUNITY')),
      credit_value DOUBLE PRECISION NOT NULL,
      assigned_to TEXT REFERENCES users(id),
      merchant_id TEXT REFERENCES merchants(id),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ASSIGNED','COMPLETED_PENDING','VERIFIED','CANCELLED')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tiers (
      name TEXT PRIMARY KEY,
      min_cycles INTEGER NOT NULL,
      max_cycles INTEGER NOT NULL,
      per_order DOUBLE PRECISION NOT NULL,
      total_cap DOUBLE PRECISION NOT NULL,
      window_days INTEGER NOT NULL
    )
  `);

  // Keep tier limits in sync with the 5-tier blueprint on every boot.
  // This is an upsert, so the values are safe to re-run and the manual
  // Supabase seed SQL produces the same result.
  await ensureTiers(db);

  // Auto-seed if database is empty (for serverless deployments)
  const result = await db.query('SELECT COUNT(*)::int as c FROM users');
  if (result.rows[0].c === 0) {
    logger.info('Database empty — seeding initial data');
    await seed(db);
  }
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
