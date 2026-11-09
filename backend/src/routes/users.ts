import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { applySettlement, checkAndApplyFreeze, getTierLimit, stripPassword } from '../helpers';
import { signToken } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  await checkAndApplyFreeze(req.user!.id);
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  const tierLimit = await getTierLimit(user.tier);
  res.json({ success: true, data: { ...stripPassword(user), tierLimit } });
}));

router.get('/demo-list', asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id LIKE $1 ORDER BY created_at DESC', ['id_%']);
  res.json({ success: true, data: result.rows.map(stripPassword) });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  res.json({ success: true, data: stripPassword(user) });
}));

router.post('/demo-login', validate(schemas.demologin), asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  const tierLimit = await getTierLimit(user.tier);
  const token = signToken(user.id, user.tier === 'ADMIN' ? 'admin' : 'user');
  res.json({ success: true, data: { ...stripPassword(user), tierLimit }, token });
}));

router.post('/login', validate(schemas.login), asyncHandler(async (req: Request, res: Response) => {
  const { credential, password } = req.body;
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE phone = $1 OR email = $1', [credential]);
  const user = result.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'No account found with that phone or email' }); return; }
  if (!user.password_hash) { res.status(401).json({ success: false, error: 'This account uses demo login — sign in via demo accounts' }); return; }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) { res.status(401).json({ success: false, error: 'Incorrect password' }); return; }
  const tierLimit = await getTierLimit(user.tier);
  const token = signToken(user.id, user.tier === 'ADMIN' ? 'admin' : 'user');
  res.json({ success: true, data: { ...stripPassword(user), tierLimit }, token });
}));

router.post('/', validate(schemas.createUser), asyncHandler(async (req: Request, res: Response) => {
  const { phone, name, email, password } = req.body;
  const db = getDb();
  if (email) {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) { res.status(409).json({ success: false, error: 'Email already registered' }); return; }
  }
  const id = uuid();
  const password_hash = await bcrypt.hash(password, 10);
  const walletAddress = `0x${id.replace(/-/g, '').padEnd(40, '0').slice(0, 40)}`;
  await db.query(
    'INSERT INTO users (id,phone,email,name,password_hash,wallet_address,clean_cycles) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, phone || null, email || null, name, password_hash, walletAddress, 0]
  );
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  const user = result.rows[0];
  const token = signToken(user.id, 'user');
  res.status(201).json({ success: true, data: stripPassword(user), token });
}));

router.post('/pay', authenticate, validate(schemas.pay), asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const { amount } = req.body;

  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user!.id]);
  const user = userResult.rows[0] as any;
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
  if (Number(user.outstanding_balance) <= 0) { res.status(400).json({ success: false, error: 'No outstanding balance to clear' }); return; }

  const settlement = await applySettlement(user.id, Number(amount), 'SETTLEMENT');
  const refreshedResult = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
  const refreshed = refreshedResult.rows[0] as any;
  const tierLimit = await getTierLimit(refreshed.tier);

  res.json({
    success: true,
    data: { ...stripPassword(refreshed), tierLimit, paid: settlement.applied, fullyCleared: settlement.fullyCleared }
  });
}));

export default router;
