const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const auth = require('../auth');
const { requireAuth, requireSameOrigin } = require('../middleware');
const db = require('../db');

const router = express.Router();

const credentialsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(11).max(11),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  phone: z.string().trim().min(11).max(11),
  password: z.string().min(1).max(128),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تلاش‌های ورود زیاد است؛ کمی بعد دوباره امتحان کنید.' },
});

router.use(requireSameOrigin);

router.post('/register', authLimiter, (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'نام، شماره موبایل و رمز عبور معتبر وارد کنید' });

  const phone = auth.normalizePhone(parsed.data.phone);
  if (!/^09\d{9}$/.test(phone)) return res.status(400).json({ error: 'شماره موبایل نامعتبر است' });

  if (db.prepare('SELECT 1 FROM users WHERE phone = ?').get(phone)) {
    return res.status(409).json({ error: 'این شماره موبایل قبلاً ثبت شده است' });
  }

  try {
    const user = auth.createUser({ ...parsed.data, phone });
    const session = auth.createSession(user.id);
    auth.setSessionCookie(res, session.token);
    return res.status(201).json({ user: auth.publicUser(user) });
  } catch (err) {
    if (String(err.code).includes('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'این شماره موبایل قبلاً ثبت شده است' });
    }
    return res.status(500).json({ error: 'ثبت‌نام انجام نشد' });
  }
});

router.post('/login', authLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'شماره موبایل یا رمز عبور نامعتبر است' });

  const phone = auth.normalizePhone(parsed.data.phone);
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  // Always perform scrypt, even when the phone is unknown, to reduce timing
  // differences that can reveal whether an account exists.
  const passwordOk = auth.verifyPassword(
    parsed.data.password,
    user?.password_hash || auth.DUMMY_PASSWORD_HASH,
  );
  if (!user || !passwordOk) {
    return res.status(401).json({ error: 'شماره موبایل یا رمز عبور اشتباه است' });
  }

  auth.deleteExpiredSessions();
  const session = auth.createSession(user.id);
  auth.setSessionCookie(res, session.token);
  return res.json({ user: auth.publicUser(user) });
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.zandieh_session;
  auth.deleteSession(token);
  auth.clearSessionCookie(res);
  return res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: auth.publicUser(user) });
});

router.patch('/me', requireAuth, (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1).max(80),
    address: z.string().trim().max(500).default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'اطلاعات پروفایل نامعتبر است' });

  db.prepare('UPDATE users SET name = ?, address = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(parsed.data.name, parsed.data.address, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: auth.publicUser(user) });
});

module.exports = router;
