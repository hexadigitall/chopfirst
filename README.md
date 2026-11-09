# Chop First — Eat Now. Pay with Dignity.

A dignity-preserving food micro-subsidy platform (BNPL for meals) with progressive trust tiers, per-order and total outstanding caps, community task marketplace, and due-date freeze guardrails. Built as an investor-ready prototype.

## Problem

Millions skip meals during financial shortfalls. Existing options — predatory loans, degrading charity, or high-interest BNPL — punish people for being short on cash. This destroys dignity and productivity.

## Solution

A simple, interactive checkout: you pay what you can afford today. Chop First covers the rest instantly and settles the merchant in full. A flat 10% fee applies to the covered amount — no compounding interest, no shame. Clear your balance with cash or community tasks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL / Supabase (via `pg`) |
| Runtime | Node.js 24 (dev: `tsx`; production: compiled JS) |

## Quick Start

```bash
cp backend/.env.example backend/.env
# Set DATABASE_URL, JWT_SECRET, and optional SEED_POOL in backend/.env
./start.sh
```

This starts both servers:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Manual start

```bash
# Terminal 1 — Backend (initializes schema on startup)
cd backend && npm install && npm run dev

# Optional: initialize schema + reseed demo data
cd backend && npm run seed

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

## Demo Users

| Name | Tier | Status | Highlights |
|------|------|--------|-----------|
| Ada Chigbu | UNVERIFIED | ACTIVE | 1 clean cycle, full credit available |
| Amina Bello | TRUSTED | ACTIVE | 25 clean cycles, moderate debt |
| Femi Adeyemi | COMMUNITY | ACTIVE | 42 clean cycles, top tier, zero outstanding |
| Nkechi Eze | VERIFIED | FROZEN | Overdue order — demonstrates freeze guardrail |
| Tunde Bakare | VERIFIED | ACTIVE | 12 clean cycles, light debt |

## Key Features

### Progressive Trust Tiers

| Tier | Per-Order Limit | Total Cap | Window | Clean Cycles |
|------|----------------|-----------|--------|--------------|
| UNVERIFIED | ₦2,500 | ₦5,000 | 7 days | 0–9 |
| VERIFIED | ₦10,000 | ₦30,000 | 14 days | 10–19 |
| TRUSTED | ₦15,000 | ₦50,000 | 14 days | 20–29 |
| ADVANCED | ₦20,000 | ₦100,000 | 14 days | 30–39 |
| COMMUNITY | ₦25,000 | ₦150,000 | 14 days | 40+ |

### "How Much You Get" Checkout

Users choose their down payment. The system calculates:
- Subsidised amount (total − down payment)
- 10% processing fee (on the subsidised portion only)
- Total outstanding
- Verifies the per-order limit and total outstanding cap before approving
- Checks portfolio exposure against the 85% seed-pool reserve

### Clean Cycles & Tier Progression

A clean cycle is earned only when a PREPAID order is fully settled on or before its due date. The user's tier is then recalculated from `clean_cycles`: 0–9 Unverified, 10–19 Verified, 20–29 Trusted, 30–39 Advanced, 40+ Community.

### Freeze Guardrail

Accounts auto-freeze when any PREPAID order passes its due date with a positive outstanding balance. No late fees or penalties are added after the due date. No new orders until the balance is cleared, then the account auto-unfreezes.

### Community Task Marketplace

Users can clear debt by completing community tasks (cleaning, delivery assistance, etc.). Tasks go through an assign → complete → verify workflow. Task credit is capped at the user's outstanding balance, and a clean cycle is only awarded if the settled order was still within its window.

### Payment

Users can pay down their outstanding balance in full or in fractions from the Dashboard. Payments settle the oldest PREPAID orders first and are recorded in the dual ledger (`outstanding` and `outstanding_naira`, plus wallet address).

### Risk & Admin Metrics

The admin dashboard reports total exposure (sum of user balances), maximum portfolio exposure (sum of tier total caps), utilisation, default rate (overdue + frozen orders / total orders, labeled when demo data is present), and seed-pool reserve status.

### $KIND Preview

Phase 3 introduces $KIND at a preview rate of 100 $KIND ≈ ₦2,500 (₦25 per $KIND). It is displayed for demonstration only and is not spendable.

## Architecture

```
chopfirst/
├── backend/
│   ├── migrations/            # Deployable SQL (tiers + dual ledger)
│   └── src/
│       ├── database.ts        # Schema + DB init
│       ├── seed.ts            # Demo data seeder + tier upserts
│       ├── tiers.ts           # Canonical 5-tier configuration
│       ├── helpers.ts         # Freeze, settlement, exposure, seed pool
│       ├── index.ts           # Express app entry
│       ├── middleware/        # Auth middleware
│       ├── models/            # TypeScript types
│       └── routes/            # API route handlers
├── frontend/
│   └── src/
│       ├── api/               # API client
│       ├── components/        # Shared components (Layout)
│       ├── pages/             # Route pages
│       ├── lib/               # Utilities
│       └── utils/             # Formatters
└── assets/                    # Logo files (original + cropped variants)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/google` | Google sign-in |
| GET | `/api/users/demo-list` | Demo accounts for the login screen |
| POST | `/api/users/demo-login` | Log in as a demo user |
| GET | `/api/platform/info` | Platform stats, tiers, and seed-pool info |
| GET | `/api/users/me` | Current user profile + tier limit |
| POST | `/api/users/pay` | Pay toward outstanding balance |
| GET | `/api/merchants` | List active merchants |
| GET | `/api/merchants/:id` | Merchant detail with menu |
| POST | `/api/orders` | Create order ("How Much You Get") |
| GET | `/api/orders/:id` | Order detail |
| POST | `/api/orders/:id/pay` | Pay a specific order |
| GET | `/api/tasks` | Available tasks |
| POST | `/api/tasks/:id/assign` | Assign a task |
| POST | `/api/tasks/:id/complete` | Mark task complete |
| POST | `/api/tasks/:id/verify` | Verify task completion |
| GET | `/api/admin/metrics` | Admin KPIs + seed-pool status |
| GET | `/api/admin/users` | All users (admin) |
| POST | `/api/admin/users/:id/freeze` | Toggle freeze |
| POST | `/api/admin/users/:id/credit` | Manually credit a user |

## Logo

Located in `assets/`:
- `chopfirst_circle.png` — Transparent background, cropped to circle design
- `chopfirst_circle.jpg` — Same crop with white background
- `chopfirst_circle.svg` — SVG wrapper with embedded PNG

Web optimised copies in `frontend/public/`.

---

Chop First — A KINDRED Network Ecosystem by Hexadigitall Technologies. Investor Prototype · © 2026
