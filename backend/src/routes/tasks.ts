import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { authenticate, requireAdmin, requireRealUser } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query(`
    SELECT t.*, m.name as merchant_name
    FROM tasks t LEFT JOIN merchants m ON m.id = t.merchant_id
    WHERE t.status = 'OPEN' OR t.assigned_to = $1
    ORDER BY (t.status = 'OPEN') DESC, t.created_at ASC
  `, [req.user!.id]);
  res.json({ success: true, data: result.rows });
}));

router.get('/all', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  const result = await db.query(`
    SELECT t.*, u.name as assigned_user, m.name as merchant_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN merchants m ON m.id = t.merchant_id
    ORDER BY t.created_at DESC
  `);
  res.json({ success: true, data: result.rows });
}));

router.post('/:id/assign', authenticate, requireRealUser, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1 AND status = $2", [req.params.id, 'OPEN']);
  const task = taskResult.rows[0] as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not available' }); return; }
  await db.query("UPDATE tasks SET assigned_to = $1, status = $2 WHERE id = $3", [req.user!.id, 'ASSIGNED', req.params.id]);
  const updatedResult = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ success: true, data: updatedResult.rows[0] });
}));

router.post('/:id/complete', authenticate, requireRealUser, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1 AND assigned_to = $2 AND status = $3", [req.params.id, req.user!.id, 'ASSIGNED']);
  const task = taskResult.rows[0] as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not found or not assigned to you' }); return; }
  await db.query("UPDATE tasks SET status = $1, completed_at = NOW() WHERE id = $2", ['COMPLETED_PENDING', req.params.id]);
  res.json({ success: true, data: { message: 'Task submitted for verification' } });
}));

router.post('/:id/verify', authenticate, requireRealUser, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1 AND status = $2", [req.params.id, 'COMPLETED_PENDING']);
  const task = taskResult.rows[0] as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not pending verification' }); return; }
  await db.query("UPDATE tasks SET status = $1 WHERE id = $2", ['VERIFIED', req.params.id]);
  // Credit user
  await db.query('UPDATE users SET outstanding_balance = GREATEST(0, outstanding_balance - $1), clean_cycles = clean_cycles + 1 WHERE id = $2', [task.credit_value, task.assigned_to]);
  // Check if fully cleared
  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [task.assigned_to]);
  const user = userResult.rows[0] as any;
  if (user.outstanding_balance <= 0 && user.status === 'FROZEN') {
    await db.query("UPDATE users SET status = $1 WHERE id = $2", ['ACTIVE', task.assigned_to]);
  }
  // Create transaction
  await db.query('INSERT INTO transactions (id,user_id,amount,type) VALUES ($1,$2,$3,$4)', [uuid(), task.assigned_to, task.credit_value, 'TASK_CREDIT']);
  // Tier upgrade check
  if (user.outstanding_balance <= 0) {
    const nextTierResult = await db.query('SELECT * FROM tier_limits WHERE min_cycles <= $1 ORDER BY min_cycles DESC LIMIT 1', [user.clean_cycles]);
    const nextTier = nextTierResult.rows[0] as any;
    if (nextTier && nextTier.tier !== user.tier) {
      await db.query('UPDATE users SET tier = $1 WHERE id = $2', [nextTier.tier, user.id]);
    }
  }
  res.json({ success: true, data: { message: 'Task verified, balance updated', user } });
}));

export default router;
