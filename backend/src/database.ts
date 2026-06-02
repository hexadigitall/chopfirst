import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'chopfirst.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const d = getDb();

  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK(tier IN ('UNVERIFIED','VERIFIED','COMMUNITY')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','FROZEN','SUSPENDED')),
      clean_cycles INTEGER NOT NULL DEFAULT 0,
      outstanding_balance REAL NOT NULL DEFAULT 0.0,
      total_subsidized REAL NOT NULL DEFAULT 0.0,
      wallet_address TEXT,
      kind_balance REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      frozen_at TEXT
    );

    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      total_prepaid INTEGER NOT NULL DEFAULT 0,
      total_revenue REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'Meal',
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      total_cost REAL NOT NULL,
      down_payment REAL NOT NULL,
      outstanding REAL NOT NULL,
      fee REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PREPAID' CHECK(status IN ('PREPAID','COMPLETED','DISPUTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      due_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      merchant_id TEXT REFERENCES merchants(id),
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('DOWN_PAYMENT','SUBSIDY','SETTLEMENT','TASK_CREDIT','FEE')),
      status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('PENDING','COMPLETED','FAILED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('PLATFORM','MERCHANT','COMMUNITY')),
      credit_value REAL NOT NULL,
      assigned_to TEXT REFERENCES users(id),
      merchant_id TEXT REFERENCES merchants(id),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ASSIGNED','COMPLETED_PENDING','VERIFIED','CANCELLED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tier_limits (
      tier TEXT PRIMARY KEY,
      max_subsidy REAL NOT NULL,
      window_days INTEGER NOT NULL,
      min_cycles INTEGER NOT NULL,
      credit_cap REAL NOT NULL DEFAULT 5000
    );
  `);

  // Migrations for existing databases
  try { d.exec('ALTER TABLE tier_limits ADD COLUMN credit_cap REAL NOT NULL DEFAULT 5000'); } catch {}
}
