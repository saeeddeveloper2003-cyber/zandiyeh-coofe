'use strict';

const auth = require('./auth');

function readSessionToken(req) {
  const cookieToken =
    req.cookies?.zandieh_session;

  if (cookieToken) {
    return cookieToken;
  }

  const header =
    req.get('authorization') || '';

  const [scheme, token] =
    header.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() === 'bearer' &&
    token
  ) {
    return token;
  }

  return null;
}

function requireAuth(req, res, next) {
  res.set(
    'Cache-Control',
    'no-store',
  );

  const token =
    readSessionToken(req);

  if (!token) {
    return res.status(401).json({
      error:
        'برای ادامه باید وارد حساب کاربری شوید',
    });
  }

  const user =
    auth.getUserBySessionToken(token);

  if (!user) {
    return res.status(401).json({
      error:
        'برای ادامه باید وارد حساب کاربری شوید',
    });
  }

  req.authToken = token;
  req.user = user;

  return next();
}

function optionalAuth(req, res, next) {
  res.set(
    'Cache-Control',
    'no-store',
  );

  const token =
    readSessionToken(req);

  req.authToken = token;

  req.user = token
    ? auth.getUserBySessionToken(token)
    : null;

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error:
        'برای ادامه باید وارد حساب کاربری شوید',
    });
  }

  const role =
    typeof req.user.role === 'string'
      ? req.user.role.trim().toLowerCase()
      : '';

  if (role !== 'admin') {
    return res.status(403).json({
      error:
        'این حساب دسترسی مدیریتی ندارد',
    });
  }

  return next();
}

function requireSameOrigin(req, res, next) {
  const allowed = String(
    process.env.FRONTEND_PUBLIC_URL ||
      'http://localhost:5173',
  )
    .split(',')
    .map((value) =>
      value.trim().replace(/\/$/, ''),
    )
    .filter(Boolean);

  const origin = req.get('origin');

  if (origin) {
    const normalizedOrigin =
      origin.trim().replace(/\/$/, '');

    if (
      allowed.includes(
        normalizedOrigin,
      )
    ) {
      return next();
    }

    return res.status(403).json({
      error: 'Origin مجاز نیست',
    });
  }

  const referer = req.get('referer');

  if (referer) {
    try {
      const refererOrigin =
        new URL(referer).origin;

      if (
        allowed.includes(refererOrigin)
      ) {
        return next();
      }
    } catch {
      // Reject below.
    }

    return res.status(403).json({
      error: 'Origin مجاز نیست',
    });
  }

  /*
   * برای درخواست‌های بدون Origin/Referer،
   * این middleware به‌تنهایی CSRF را ثابت نمی‌کند.
   * احراز هویت و SameSite cookie باید در auth نیز تنظیم باشند.
   */
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireSameOrigin,
  readSessionToken,
};