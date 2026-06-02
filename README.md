# Chop First — Eat Now. Pay with Dignity.

A dignity-preserving food micro-subsidy platform (BNPL for meals) with progressive trust tiers, credit caps, community task marketplace, and freeze guardrails. Built as an investor-ready prototype.

## Problem

Millions skip meals during financial shortfalls. Existing options — predatory loans, degrading charity, or high-interest BNPL — punish people for being short on cash. This destroys dignity and productivity.

## Solution

A simple, interactive checkout: you pay what you can afford today. Chop First covers the rest instantly and settles the merchant in full. No interest. No shame. Clear your balance with cash or community tasks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (via better-sqlite3) |
| Runtime | tsx (TypeScript execution) |

## Quick Start

```bash
./start.sh
```

This starts both servers:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Manual start

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run seed && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

## Demo Users

| Name | Tier | Status | Highlights |
|------|------|--------|-----------|
| Chidi Okonkwo | UNVERIFIED | ACTIVE | Clean slate, full credit available |
| Amina Bello | VERIFIED | ACTIVE | Recurring user with moderate debt |
| Femi Adeyemi | COMMUNITY | ACTIVE | Top tier, zero outstanding |
| Nkechi Eze | UNVERIFIED | FROZEN | Near credit cap — demonstrates freeze guardrail |
| Tunde Bakare | VERIFIED | ACTIVE | Light debt, regular user |

## Key Features

### Progressive Trust Tiers

| Tier | Per-Order Limit | Credit Cap | Window | Cycles |
|------|----------------|------------|--------|--------|
| UNVERIFIED | ₦2,500 | ₦5,000 | 7 days | 0–2 |
| VERIFIED | ₦10,000 | ₦30,000 | 14 days | 3–5 |
| COMMUNITY | ₦25,000 | ₦150,000 | 14 days | 6+ |

### "How Much You Get" Checkout

Users choose their down payment. The system calculates:
- Subsidised amount (total − down payment)
- 10% processing fee (on the subsidised portion only)
- Total outstanding
- Verifies per-order limit and credit cap before approving

### Freeze Guardrail

Accounts auto-freeze when remaining credit dips below the cheapest available menu item. No new orders until some debt is cleared. Auto-unfreezes once sufficient credit is freed.

### Community Task Marketplace

Users can clear debt by completing community tasks (cleaning, delivery assistance, etc.). Tasks go through an assign → complete → verify workflow.

### Payment

Users can pay down their outstanding balance in full or in fractions from the Dashboard. Payments settle the oldest PREPAID orders first.

## Architecture

```
chopfirst/
├── backend/
│   └── src/
│       ├── database.ts        # Schema + DB init
│       ├── seed.ts            # Demo data seeder
│       ├── helpers.ts         # Shared logic (freeze check, etc.)
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
| GET | `/api/platform/info` | Platform stats and tier info |
| GET | `/api/users/me` | Current user profile |
| POST | `/api/users/pay` | Pay toward outstanding balance |
| GET | `/api/merchants` | List active merchants |
| GET | `/api/merchants/:id` | Merchant detail with menu |
| POST | `/api/orders` | Create order ("How Much You Get") |
| POST | `/api/orders/:id/pay` | Pay a specific order |
| GET | `/api/tasks` | Available tasks |
| POST | `/api/tasks/:id/assign` | Assign a task |
| POST | `/api/tasks/:id/complete` | Mark task complete |
| POST | `/api/tasks/:id/verify` | Verify task completion |
| GET | `/api/admin/metrics` | Admin KPIs |
| GET | `/api/admin/users` | All users (admin) |
| POST | `/api/admin/users/:id/freeze` | Toggle freeze |

## Logo

Located in `assets/`:
- `chopfirst_circle.png` — Transparent background, cropped to circle design
- `chopfirst_circle.jpg` — Same crop with white background
- `chopfirst_circle.svg` — SVG wrapper with embedded PNG

Web optimised copies in `frontend/public/`.

---

Chop First — A KINDRED Network Ecosystem by Hexadigitall Technologies. Investor Prototype · © 2026
