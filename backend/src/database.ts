import 'dotenv/config';
import { Pool } from 'pg';
import { Request, Response, NextFunction } from 'express';

let pool: Pool;

export function getDb(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Add it in Vercel dashboard → Settings → Environment Variables.');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : process.env.DATABASE_URL
          ? true
          : false,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
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
      fee DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'PREPAID' CHECK(status IN ('PREPAID','COMPLETED','DISPUTED')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      due_at TIMESTAMP NOT NULL
    )
  `);

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
    CREATE TABLE IF NOT EXISTS tier_limits (
      tier TEXT PRIMARY KEY,
      max_subsidy DOUBLE PRECISION NOT NULL,
      window_days INTEGER NOT NULL,
      min_cycles INTEGER NOT NULL,
      credit_cap DOUBLE PRECISION NOT NULL DEFAULT 5000
    )
  `);

  // Migration: add credit_cap if missing (safe to re-run)
  await db.query(`
    ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS credit_cap DOUBLE PRECISION NOT NULL DEFAULT 5000
  `).catch(() => {});

  // Auto-seed if database is empty (for serverless deployments)
  const result = await db.query('SELECT COUNT(*)::int as c FROM users');
  if (result.rows[0].c === 0) {
    const { seed } = require('./seed');
    await seed(db);
  }
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
