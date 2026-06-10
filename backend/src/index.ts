import express from 'express';
import cors from 'cors';
import { initDb } from './database';
import userRoutes from './routes/users';
import merchantRoutes from './routes/merchants';
import orderRoutes from './routes/orders';
import taskRoutes from './routes/tasks';
import adminRoutes from './routes/admin';
import platformRoutes from './routes/platform';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Wait for DB init before handling requests
let initPromise: Promise<void> | null = null;
app.use((_req, res, next) => {
  if (!initPromise) initPromise = initDb();
  initPromise.then(() => next()).catch((err) => {
    console.error('DB init failed:', err?.message || err);
    initPromise = null; // Allow retry on next request
    const message = process.env.DATABASE_URL
      ? 'Database connection failed. Check that your Supabase project is active and the DATABASE_URL is correct.'
      : 'DATABASE_URL environment variable is not set. Add it in Vercel dashboard → Settings → Environment Variables.';
    res.status(500).json({ success: false, error: message });
  });
});

app.use('/api/users', userRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/platform', platformRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

if (process.env.VERCEL !== '1') {
  initDb().then(() => {
    app.listen(PORT, () => {
      console.log(`🍽️  Chop First API running on http://localhost:${PORT}`);
    });
  });
}

export default app;
