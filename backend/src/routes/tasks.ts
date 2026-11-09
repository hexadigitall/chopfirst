import { Router, Request, Response } from 'express';
import { getDb, asyncHandler } from '../database';
import { authenticate } from '../middleware/auth';
import { applySettlement } from '../helpers';

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

router.post('/:id/assign', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1 AND status = $2", [req.params.id, 'OPEN']);
  const task = taskResult.rows[0] as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not available' }); return; }
  await db.query("UPDATE tasks SET assigned_to = $1, status = $2 WHERE id = $3", [req.user!.id, 'ASSIGNED', req.params.id]);
  const updatedResult = await db.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ success: true, data: updatedResult.rows[0] });
}));

router.post('/:id/complete', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1 AND assigned_to = $2 AND status = $3", [req.params.id, req.user!.id, 'ASSIGNED']);
  const task = taskResult.rows[0] as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not found or not assigned to you' }); return; }
  await db.query("UPDATE tasks SET status = $1, completed_at = NOW() WHERE id = $2", ['COMPLETED_PENDING', req.params.id]);
  res.json({ success: true, data: { message: 'Task submitted for verification' } });
}));

router.post('/:id/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const db = getDb();
  const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1 AND status = $2", [req.params.id, 'COMPLETED_PENDING']);
  const task = taskResult.rows[0] as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not pending verification' }); return; }

  await db.query("UPDATE tasks SET status = $1 WHERE id = $2", ['VERIFIED', req.params.id]);

  // Credit is capped at the user's outstanding balance; any excess is discarded.
  const settlement = await applySettlement(task.assigned_to, Number(task.credit_value), 'TASK_CREDIT');

  res.json({
    success: true,
    data: {
      message: 'Task verified, balance updated',
      creditApplied: settlement.applied,
      fullyCleared: settlement.fullyCleared,
      user: settlement.user
    }
  });
}));

export default router;
