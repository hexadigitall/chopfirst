import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authenticate } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*, m.name as merchant_name
    FROM tasks t LEFT JOIN merchants m ON m.id = t.merchant_id
    WHERE t.status = 'OPEN' OR t.assigned_to = ?
    ORDER BY t.status = 'OPEN' DESC, t.created_at ASC
  `).all(req.user!.id);
  res.json({ success: true, data: tasks });
});

router.get('/all', (_req: Request, res: Response) => {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*, u.name as assigned_user, m.name as merchant_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    LEFT JOIN merchants m ON m.id = t.merchant_id
    ORDER BY t.created_at DESC
  `).all();
  res.json({ success: true, data: tasks });
});

router.post('/:id/assign', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND status = ?').get(req.params.id, 'OPEN') as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not available' }); return; }
  db.prepare('UPDATE tasks SET assigned_to = ?, status = ? WHERE id = ?').run(req.user!.id, 'ASSIGNED', req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

router.post('/:id/complete', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND assigned_to = ? AND status = ?').get(req.params.id, req.user!.id, 'ASSIGNED') as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not found or not assigned to you' }); return; }
  db.prepare('UPDATE tasks SET status = ?, completed_at = datetime(\'now\') WHERE id = ?').run('COMPLETED_PENDING', req.params.id);
  res.json({ success: true, data: { message: 'Task submitted for verification' } });
});

router.post('/:id/verify', (req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND status = ?').get(req.params.id, 'COMPLETED_PENDING') as any;
  if (!task) { res.status(404).json({ success: false, error: 'Task not pending verification' }); return; }
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('VERIFIED', req.params.id);
  // Credit user
  db.prepare('UPDATE users SET outstanding_balance = MAX(0, outstanding_balance - ?), clean_cycles = clean_cycles + 1 WHERE id = ?').run(task.credit_value, task.assigned_to);
  // Check if fully cleared
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(task.assigned_to) as any;
  if (user.outstanding_balance <= 0 && user.status === 'FROZEN') {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('ACTIVE', task.assigned_to);
  }
  // Create transaction
  db.prepare('INSERT INTO transactions (id,user_id,amount,type) VALUES (?,?,?,?)').run(uuid(), task.assigned_to, task.credit_value, 'TASK_CREDIT');
  // Tier upgrade check
  if (user.outstanding_balance <= 0) {
    const nextTier = db.prepare('SELECT * FROM tier_limits WHERE min_cycles <= ? ORDER BY min_cycles DESC LIMIT 1').get(user.clean_cycles) as any;
    if (nextTier && nextTier.tier !== user.tier) {
      db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(nextTier.tier, user.id);
    }
  }
  res.json({ success: true, data: { message: 'Task verified, balance updated', user } });
});

export default router;
