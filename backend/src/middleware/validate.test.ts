import express from 'express';
import { validate, schemas } from './validate';
import request from 'supertest';

function testApp(schema: any) {
  const app = express();
  app.use(express.json());
  app.post('/test', validate(schema), (req, res) => res.json({ ok: true }));
  return app;
}

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

  console.log('validate middleware');

  await test('passes valid login body', async () => {
    const res = await request(testApp(schemas.login)).post('/test').send({ credential: 'user@example.com', password: 'secret' });
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
  });

  await test('rejects login without password', async () => {
    const res = await request(testApp(schemas.login)).post('/test').send({ credential: 'user' });
    if (res.status !== 400) throw new Error(`Expected 400 got ${res.status}`);
  });

  await test('rejects weak password on createUser', async () => {
    const res = await request(testApp(schemas.createUser)).post('/test').send({ name: 'Test', password: '123', phone: '123456' });
    if (res.status !== 400) throw new Error(`Expected 400 got ${res.status}`);
  });

  await test('rejects createUser without phone or email', async () => {
    const res = await request(testApp(schemas.createUser)).post('/test').send({ name: 'Test', password: '123456' });
    if (res.status !== 400) throw new Error(`Expected 400 got ${res.status}`);
  });

  await test('allows createUser with phone only', async () => {
    const res = await request(testApp(schemas.createUser)).post('/test').send({ name: 'Test', password: '123456', phone: '+2348000000000' });
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
  });

  await test('allows createUser with email only', async () => {
    const res = await request(testApp(schemas.createUser)).post('/test').send({ name: 'Test', password: '123456', email: 'test@example.com' });
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
  });

  await test('rejects invalid email in createUser', async () => {
    const res = await request(testApp(schemas.createUser)).post('/test').send({ name: 'Test', password: '123456', email: 'not-an-email' });
    if (res.status !== 400) throw new Error(`Expected 400 got ${res.status}`);
  });

  await test('rejects zero amount on pay', async () => {
    const res = await request(testApp(schemas.pay)).post('/test').send({ amount: 0 });
    if (res.status !== 400) throw new Error(`Expected 400 got ${res.status}`);
  });

  await test('rejects negative amount on pay', async () => {
    const res = await request(testApp(schemas.pay)).post('/test').send({ amount: -1 });
    if (res.status !== 400) throw new Error(`Expected 400 got ${res.status}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
