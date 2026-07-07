import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDb } from './database';
import { logger } from './logger';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import merchantRoutes from './routes/merchants';
import orderRoutes from './routes/orders';
import taskRoutes from './routes/tasks';
import adminRoutes from './routes/admin';
import platformRoutes from './routes/platform';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, path: req.path, query: req.query }, 'incoming request');
  next();
});

// Health check — always responds, even before DB init
app.get('/api/health', (_req, res) => {
  const dbReady = !!process.env.DATABASE_URL;
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbReady ? 'DATABASE_URL configured' : 'DATABASE_URL not set',
    }
  });
});

// Wait for DB init before handling other API requests
let initPromise: Promise<void> | null = null;
app.use('/api', (_req, res, next) => {
  if (!initPromise) initPromise = initDb();
  initPromise.then(() => next()).catch((err) => {
    logger.error({ err }, 'DB init failed');
    initPromise = null;
    const message = process.env.DATABASE_URL
      ? `Database connection failed: ${err?.message || err}`
      : 'DATABASE_URL environment variable is not set. Add it in Vercel dashboard → Settings → Environment Variables.';
    res.status(500).json({ success: false, error: message });
  });
});

app.use('/api/auth', authRoutes);

app.use('/api/users', userRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/platform', platformRoutes);

// Error middleware — catch all and return JSON
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
});

if (process.env.VERCEL !== '1') {
  initDb().then(() => {
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Chop First API started');
    });
  });
}

export default app;
