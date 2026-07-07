import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { getDb, asyncHandler } from '../database';
import { signToken } from '../middleware/auth';
import { stripPassword } from '../helpers';
import { v4 as uuid } from 'uuid';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();

router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { googleToken } = req.body;
  if (!googleToken) {
    res.status(400).json({ success: false, error: 'googleToken is required' });
    return;
  }

  let payload: any;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid Google token' });
    return;
  }

  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name;
  const avatar = payload.picture;

  const db = getDb();

  const existingByGoogle = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  if (existingByGoogle.rows.length > 0) {
    const user = existingByGoogle.rows[0] as any;
    if (avatar && user.avatar !== avatar) {
      await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, user.id]);
      user.avatar = avatar;
    }
    const tierResult = await db.query('SELECT * FROM tier_limits WHERE tier = $1', [user.tier]);
    const tierLimit = tierResult.rows[0] as any;
    const token = signToken(user.id, user.tier === 'ADMIN' ? 'admin' : 'user');
    res.json({ success: true, data: { ...stripPassword(user), tierLimit, isNew: false }, token });
    return;
  }

  if (email) {
    const existingByEmail = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingByEmail.rows.length > 0) {
      const user = existingByEmail.rows[0] as any;
      await db.query('UPDATE users SET google_id = $1, avatar = COALESCE($2, avatar) WHERE id = $3', [googleId, avatar, user.id]);
      const tierResult = await db.query('SELECT * FROM tier_limits WHERE tier = $1', [user.tier]);
      const tierLimit = tierResult.rows[0] as any;
      const token = signToken(user.id, user.tier === 'ADMIN' ? 'admin' : 'user');
      res.json({ success: true, data: { ...stripPassword(user), tierLimit, isNew: false }, token });
      return;
    }
  }

  const id = uuid();
  const displayName = name || email?.split('@')[0] || 'Google User';
  await db.query(
    'INSERT INTO users (id, email, name, google_id, avatar, clean_cycles) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, email || null, displayName, googleId, avatar || null, 10]
  );
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  const user = result.rows[0] as any;
  const token = signToken(user.id, 'user');
  res.status(201).json({ success: true, data: { ...stripPassword(user), isNew: true }, token });
}));

export default router;
