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

initDb();

app.use('/api/users', userRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/platform', platformRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.listen(PORT, () => {
  console.log(`🍽️  Chop First API running on http://localhost:${PORT}`);
});
