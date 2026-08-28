'use strict';

const crypto = require('node:crypto');
const { nanoid } = require('nanoid');

const db = require('./db');

/* =========================================================
   Configuration
========================================================= */

const SESSION_TTL_SECONDS = Math.max(
  60,
  Number(
    process.env.SESSION_TTL_SECONDS ||
      60 * 60 * 24 * 30,
  ),
);

const PASSWORD_KEYLEN = 64;
const PASSWORD_SALT_BYTES = 16;
const TOKEN_BYTES = 32;

const SCRYPT_OPTIONS = Object.freeze({
  N: 16384,
  r: 8,
  p: 2,
  maxmem: 64 * 1024 * 1024,
});

const DUMMY_PASSWORD_HASH =
  'scrypt$BwcHBwcHBwcHBwcHBwcHBw$we9NfpOR5R-m7Y6-b_OWQX55L9YyD_tOiA7oErwT-wzs_7Nasu2rWbikIpADpYnAYWooEfG6JXjcPrhILAmePQ';

/* =========================================================
   Phone normalization
========================================================= */

function normalizePhone(phone) {
  return String(phone || '')
    .replace(/[۰-۹]/g, (digit) =>
      String(
        '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit),
      ),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String(
        '٠١٢٣٤٥٦٧٨٩'.indexOf(digit),
      ),
    )
    .trim();
}

/* =========================================================
   Password hashing
========================================================= */

function hashPassword(
  password,
  salt = crypto.randomBytes(
    PASSWORD_SALT_BYTES,
  ),
) {
  if (
    typeof password !== 'string' ||
    password.length === 0
  ) {
    throw new TypeError(
      'Password must be a non-empty string',
    );
  }

  if (
    !Buffer.isBuffer(salt) ||
    salt.length !== PASSWORD_SALT_BYTES
  ) {
    throw new TypeError(
      'Invalid password salt',
    );
  }

  const derivedKey =
    crypto.scryptSync(
      password,
      salt,
      PASSWORD_KEYLEN,
      SCRYPT_OPTIONS,
    );

  return [
    'scrypt',
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

function verifyPassword(
  password,
  encodedHash,
) {
  if (
    typeof password !== 'string' ||
    typeof encodedHash !== 'string'
  ) {
    return false;
  }

  const parts =
    encodedHash.split('$');

  if (parts.length !== 3) {
    return false;
  }

  const [
    algorithm,
    saltText,
    hashText,
  ] = parts;

  if (
    algorithm !== 'scrypt' ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  try {
    const salt =
      Buffer.from(
        saltText,
        'base64url',
      );

    const expected =
      Buffer.from(
        hashText,
        'base64url',
      );

    if (
      salt.length !==
      PASSWORD_SALT_BYTES
    ) {
      return false;
    }

    if (
      expected.length !==
      PASSWORD_KEYLEN
    ) {
      return false;
    }

    const actual =
      crypto.scryptSync(
        password,
        salt,
        expected.length,
        SCRYPT_OPTIONS,
      );

    return (
      actual.length ===
        expected.length &&
      crypto.timingSafeEqual(
        actual,
        expected,
      )
    );
  } catch {
    return false;
  }
}

/* =========================================================
   Session tokens
========================================================= */

function hashSessionToken(token) {
  return crypto
    .createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

/* =========================================================
   Public user object
========================================================= */

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role:
      typeof user.role === 'string'
        ? user.role.trim().toLowerCase()
        : 'customer',
    address: user.address || '',
    createdAt: user.created_at,
  };
}

/* =========================================================
   User creation
========================================================= */

function createUser({
  name,
  phone,
  password,
}) {
  const normalizedPhone =
    normalizePhone(phone);

  const cleanName =
    String(name || '').trim();

  if (!cleanName) {
    throw new Error(
      'نام کاربر الزامی است',
    );
  }

  if (!/^09\d{9}$/.test(
    normalizedPhone,
  )) {
    throw new Error(
      'شماره موبایل نامعتبر است',
    );
  }

  if (
    typeof password !== 'string' ||
    password.length < 8
  ) {
    throw new Error(
      'رمز عبور باید حداقل ۸ کاراکتر باشد',
    );
  }

  const userId =
    nanoid(16);

  const passwordHash =
    hashPassword(password);

  /*
   * Role is ALWAYS customer at signup.
   * Never trust role from the client.
   */
  db.prepare(
    `INSERT INTO users (
      id,
      name,
      phone,
      password_hash,
      role
    )
    VALUES (?, ?, ?, ?, 'customer')`,
  ).run(
    userId,
    cleanName,
    normalizedPhone,
    passwordHash,
  );

  return db
    .prepare(
      `SELECT
        id,
        name,
        phone,
        role,
        address,
        created_at
       FROM users
       WHERE id = ?`,
    )
    .get(userId);
}

/* =========================================================
   Session creation
========================================================= */

function createSession(userId) {
  if (!userId) {
    throw new Error(
      'userId is required',
    );
  }

  /*
   * 256-bit random session token.
   * Only its SHA-256 hash is stored in DB.
   */
  const token =
    crypto
      .randomBytes(TOKEN_BYTES)
      .toString('base64url');

  const sessionId =
    nanoid(16);

  const tokenHash =
    hashSessionToken(token);

  const expiresAt =
    new Date(
      Date.now() +
        SESSION_TTL_SECONDS * 1000,
    ).toISOString();

  db.prepare(
    `INSERT INTO sessions (
      id,
      user_id,
      token_hash,
      expires_at
    )
    VALUES (?, ?, ?, ?)`,
  ).run(
    sessionId,
    userId,
    tokenHash,
    expiresAt,
  );

  return {
    token,
    expiresAt,
  };
}

/* =========================================================
   Get user from session
========================================================= */

function getUserBySessionToken(token) {
  if (
    typeof token !== 'string' ||
    token.length < 20 ||
    token.length > 256
  ) {
    return null;
  }

  const tokenHash =
    hashSessionToken(token);

  const now =
    new Date().toISOString();

  const row =
    db
      .prepare(
        `SELECT
          u.id,
          u.name,
          u.phone,
          u.role,
          u.address,
          u.created_at,
          s.id AS session_id,
          s.expires_at AS session_expires_at
         FROM sessions s
         INNER JOIN users u
           ON u.id = s.user_id
         WHERE s.token_hash = ?
           AND s.expires_at > ?`,
      )
      .get(
        tokenHash,
        now,
      );

  return row
    ? publicUser(row)
    : null;
}

/* =========================================================
   Session deletion
========================================================= */

function deleteSession(token) {
  if (
    typeof token !== 'string' ||
    token.length === 0
  ) {
    return;
  }

  const tokenHash =
    hashSessionToken(token);

  db.prepare(
    `DELETE FROM sessions
     WHERE token_hash = ?`,
  ).run(tokenHash);
}

/* =========================================================
   Delete expired sessions
========================================================= */

function deleteExpiredSessions() {
  db.prepare(
    `DELETE FROM sessions
     WHERE expires_at <= ?`,
  ).run(new Date().toISOString());
}

/* =========================================================
   Cookies
========================================================= */

function cookieOptions() {
  const isProduction =
    String(
      process.env.NODE_ENV || '',
    ).toLowerCase() ===
    'production';

  const configuredSameSite =
    String(
      process.env.SESSION_COOKIE_SAMESITE ||
        'lax',
    ).toLowerCase();

  const sameSite =
    ['lax', 'strict', 'none'].includes(
      configuredSameSite,
    )
      ? configuredSameSite
      : 'lax';

  /*
   * SameSite=None requires Secure.
   */
  const secure =
    isProduction ||
    sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge:
      SESSION_TTL_SECONDS * 1000,
  };
}

function setSessionCookie(
  res,
  token,
) {
  if (
    !res ||
    typeof res.cookie !== 'function'
  ) {
    throw new TypeError(
      'Invalid response object',
    );
  }

  res.cookie(
    'zandieh_session',
    token,
    cookieOptions(),
  );
}

function clearSessionCookie(res) {
  if (
    !res ||
    typeof res.clearCookie !==
      'function'
  ) {
    throw new TypeError(
      'Invalid response object',
    );
  }

  res.clearCookie(
    'zandieh_session',
    cookieOptions(),
  );
}

/* =========================================================
   Admin bootstrap helper
========================================================= */

/*
 * This function is NOT exposed as an HTTP endpoint.
 *
 * Use it only from a trusted server-side bootstrap script
 * or a one-time administrative setup process.
 *
 * Never accept userId/role from an unauthenticated request.
 */
function makeUserAdmin(userId) {
  if (
    typeof userId !== 'string' ||
    userId.trim().length === 0
  ) {
    throw new TypeError(
      'Invalid userId',
    );
  }

  const result =
    db
      .prepare(
        `UPDATE users
         SET role = 'admin'
         WHERE id = ?`,
      )
      .run(
        userId.trim(),
      );

  return result.changes === 1;
}

/* =========================================================
   Exports
========================================================= */

module.exports = {
  SESSION_TTL_SECONDS,

  normalizePhone,

  hashPassword,
  verifyPassword,

  createUser,
  createSession,

  getUserBySessionToken,

  deleteSession,
  deleteExpiredSessions,

  setSessionCookie,
  clearSessionCookie,

  publicUser,

  makeUserAdmin,

  DUMMY_PASSWORD_HASH,
};