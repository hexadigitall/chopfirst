import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticate, optionalAuth, signToken } from './auth';

const SECRET = process.env.JWT_SECRET || 'chopfirst-dev-secret-do-not-use-in-production';

async function main() {
  let passed = 0, failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e: any) {
      console.log(`  ✗ ${name}: ${e.message}`);
      failed++;
    }
  }

  console.log('signToken');
  await test('returns a valid JWT', async () => {
    const token = signToken('user123', 'user');
    const decoded = jwt.verify(token, SECRET) as any;
    if (decoded.userId !== 'user123') throw new Error('Wrong userId');
    if (decoded.role !== 'user') throw new Error('Wrong role');
  });

  console.log('\nauthenticate middleware');
  await test('allows requests with valid token', async () => {
    const token = signToken('user123', 'user');
    const app = express();
    app.get('/test', authenticate, (req, res) => res.json({ userId: req.user!.id }));
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
    if (res.body.userId !== 'user123') throw new Error('Wrong userId in response');
  });

  await test('rejects requests without Authorization header', async () => {
    const app = express();
    app.get('/test', authenticate, (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/test');
    if (res.status !== 401) throw new Error(`Expected 401 got ${res.status}`);
  });

  await test('rejects requests with invalid token', async () => {
    const app = express();
    app.get('/test', authenticate, (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/test').set('Authorization', 'Bearer invalid-token');
    if (res.status !== 401) throw new Error(`Expected 401 got ${res.status}`);
  });

  await test('rejects requests with malformed header', async () => {
    const app = express();
    app.get('/test', authenticate, (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/test').set('Authorization', 'NotBearer token');
    if (res.status !== 401) throw new Error(`Expected 401 got ${res.status}`);
  });

  console.log('\noptionalAuth middleware');
  await test('sets user when valid token provided', async () => {
    const token = signToken('user123', 'user');
    const app = express();
    app.get('/test', optionalAuth, (req, res) => res.json({ userId: req.user?.id }));
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
    if (res.body.userId !== 'user123') throw new Error('Wrong userId');
  });

  await test('passes through without token', async () => {
    const app = express();
    app.get('/test', optionalAuth, (req, res) => res.json({ userId: req.user?.id }));
    const res = await request(app).get('/test');
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
    if (res.body.userId !== undefined) throw new Error('Expected no userId');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
