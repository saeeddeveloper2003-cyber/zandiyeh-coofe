import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let db;
let dbPath;
let app;

async function freshApp() {
  vi.resetModules();
  dbPath = path.join(os.tmpdir(), `zandieh-auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  process.env.DB_PATH = dbPath;
  process.env.FRONTEND_PUBLIC_URL = 'http://localhost:5173';
  process.env.NODE_ENV = 'test';
  process.env.SESSION_TTL_SECONDS = '3600';
  const dbModulePath = require.resolve('../db.js');
  delete require.cache[dbModulePath];
  db = require('../db.js');
  const { default: authRouter } = await import('./auth.js');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.cookies = Object.create(null);
    for (const part of (req.get('cookie') || '').split(';')) {
      const i = part.indexOf('=');
      if (i > -1) req.cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    next();
  });
  app.use('/api/auth', authRouter);
}

beforeEach(async () => { await freshApp(); });

afterEach(() => {
  if (db && db.open) db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbPath + suffix); } catch { /* ignore */ }
  }
});

describe('authentication', () => {
  it('registers a user, hashes the password, and creates a session cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'سعید رضایی',
      phone: '09121234567',
      password: 'StrongPass123',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(expect.objectContaining({ name: 'سعید رضایی', phone: '09121234567', role: 'customer' }));
    expect(res.headers['set-cookie'][0]).toContain('zandieh_session=');
    const row = db.prepare('SELECT password_hash FROM users WHERE phone = ?').get('09121234567');
    expect(row.password_hash).toMatch(/^scrypt\$/);
    expect(row.password_hash).not.toContain('StrongPass123');
  });

  it('rejects duplicate phone numbers', async () => {
    const payload = { name: 'کاربر', phone: '09121234567', password: 'StrongPass123' };
    expect((await request(app).post('/api/auth/register').send(payload)).status).toBe(201);
    expect((await request(app).post('/api/auth/register').send(payload)).status).toBe(409);
  });

  it('keeps a dedicated dummy scrypt hash for unknown-user login timing mitigation', async () => {
    const authModule = await import('../auth.js');
    expect(authModule.default?.DUMMY_PASSWORD_HASH || authModule.DUMMY_PASSWORD_HASH).toMatch(/^scrypt\$/);
  });

  it('logs in with the correct password and rejects the wrong password', async () => {
    await request(app).post('/api/auth/register').send({ name: 'کاربر', phone: '09121234567', password: 'StrongPass123' });
    const wrong = await request(app).post('/api/auth/login').send({ phone: '09121234567', password: 'WrongPass123' });
    const right = await request(app).post('/api/auth/login').send({ phone: '09121234567', password: 'StrongPass123' });
    expect(wrong.status).toBe(401);
    expect(right.status).toBe(200);
    expect(right.headers['set-cookie'][0]).toContain('zandieh_session=');
  });

  it('returns the current user and blocks access without a session', async () => {
    const anonymous = await request(app).get('/api/auth/me');
    expect(anonymous.status).toBe(401);

    const register = await request(app).post('/api/auth/register').send({ name: 'کاربر', phone: '09121234567', password: 'StrongPass123' });
    const cookie = register.headers['set-cookie'][0];
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.phone).toBe('09121234567');
  });

  it('logs out and invalidates the server-side session', async () => {
    const register = await request(app).post('/api/auth/register').send({ name: 'کاربر', phone: '09121234567', password: 'StrongPass123' });
    const cookie = register.headers['set-cookie'][0];
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  it('updates profile data while keeping the phone and role server-controlled', async () => {
    const register = await request(app).post('/api/auth/register').send({ name: 'کاربر', phone: '09121234567', password: 'StrongPass123' });
    const cookie = register.headers['set-cookie'][0];
    const update = await request(app).patch('/api/auth/me').set('Cookie', cookie).send({ name: 'کاربر جدید', address: 'شیراز، خیابان نمونه، پلاک ۱' });
    expect(update.status).toBe(200);
    expect(update.body.user).toEqual(expect.objectContaining({ name: 'کاربر جدید', address: 'شیراز، خیابان نمونه، پلاک ۱', phone: '09121234567' }));
  });
});
