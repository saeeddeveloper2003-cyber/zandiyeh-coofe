require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const paymentRouter = require('./routes/payment');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const logger = require('./lib/logger');

const app = express();

/* =========================================================
   ENV
========================================================= */

const backendPublicUrl = String(
  process.env.BACKEND_PUBLIC_URL || ''
)
  .trim()
  .replace(/\/$/, '');

if (!backendPublicUrl) {
  logger.error(
    'BACKEND_PUBLIC_URL تنظیم نشده است.'
  );
  process.exit(1);
}

try {
  new URL(backendPublicUrl);
} catch {
  logger.error(
    'BACKEND_PUBLIC_URL یک URL معتبر نیست.'
  );
  process.exit(1);
}

process.env.BACKEND_PUBLIC_URL = backendPublicUrl;

/* =========================================================
   ZARINPAL
========================================================= */

const SANDBOX =
  String(
    process.env.ZARINPAL_SANDBOX || 'true'
  ).toLowerCase() === 'true';

const PLACEHOLDER_MERCHANT_ID =
  '00000000-0000-0000-0000-000000000000';

if (
  !SANDBOX &&
  (
    !process.env.ZARINPAL_MERCHANT_ID ||
    process.env.ZARINPAL_MERCHANT_ID ===
      PLACEHOLDER_MERCHANT_ID
  )
) {
  logger.error(
    'ZARINPAL_SANDBOX=false ولی ZARINPAL_MERCHANT_ID معتبر تنظیم نشده است.'
  );

  process.exit(1);
}

if (SANDBOX) {
  logger.warn(
    'ZARINPAL_SANDBOX=true — حالت آزمایشی فعال است.'
  );
}

/* =========================================================
   EXPRESS
========================================================= */

const trustProxy =
  String(
    process.env.TRUST_PROXY || 'false'
  ).toLowerCase() === 'true';

app.set(
  'trust proxy',
  trustProxy ? 1 : 0
);

app.use(helmet());

/* =========================================================
   CORS
========================================================= */

const envOrigins = String(
  process.env.FRONTEND_PUBLIC_URL || ''
)
  .split(',')
  .map((origin) =>
    origin.trim().replace(/\/$/, '')
  )
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  ...envOrigins,
].filter(
  (origin, index, array) =>
    array.indexOf(origin) === index
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin =
      String(origin)
        .trim()
        .replace(/\/$/, '');

    if (
      allowedOrigins.includes(
        normalizedOrigin
      )
    ) {
      return callback(null, true);
    }

    logger.warn(
      `Blocked CORS origin: ${normalizedOrigin}`
    );

    return callback(
      new Error(
        `CORS origin not allowed: ${normalizedOrigin}`
      )
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Idempotency-Key',
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

/* =========================================================
   BODY
========================================================= */

app.use(
  express.json({
    limit: '32kb',
  })
);

/* =========================================================
   COOKIE PARSER
========================================================= */

app.use((req, _res, next) => {
  const raw = req.get('cookie') || '';

  req.cookies = Object.create(null);

  for (const part of raw.split(';')) {
    const index = part.indexOf('=');

    if (index === -1) {
      continue;
    }

    const key = part
      .slice(0, index)
      .trim();

    const value = part
      .slice(index + 1)
      .trim();

    if (!key) {
      continue;
    }

    try {
      req.cookies[key] =
        decodeURIComponent(value);
    } catch {
      req.cookies[key] = value;
    }
  }

  next();
});

/* =========================================================
   LOGGING
========================================================= */

app.use(morgan('dev'));

/* =========================================================
   RATE LIMIT
========================================================= */

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  '/api',
  apiLimiter
);

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      'درخواست‌های زیادی از این آدرس ثبت شده، کمی بعد دوباره تلاش کنید.',
  },
});

app.use(
  '/api/orders',
  orderLimiter
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
  '/api/health',
  (_req, res) => {
    res.json({
      ok: true,
    });
  }
);

/* =========================================================
   ROUTER VALIDATION
========================================================= */

function mountRouter(
  path,
  router,
  name
) {
  if (
    typeof router !== 'function'
  ) {
    logger.error(
      `${name} معتبر نیست. نوع دریافت‌شده: ${typeof router}`
    );

    throw new TypeError(
      `${name} باید یک Express Router باشد.`
    );
  }

  app.use(path, router);
}

/* =========================================================
   ROUTES
========================================================= */

mountRouter(
  '/api/auth',
  authRouter,
  'authRouter'
);

mountRouter(
  '/api/products',
  productsRouter,
  'productsRouter'
);

mountRouter(
  '/api/orders',
  ordersRouter,
  'ordersRouter'
);

mountRouter(
  '/api/payment',
  paymentRouter,
  'paymentRouter'
);

mountRouter(
  '/api/admin',
  adminRouter,
  'adminRouter'
);

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {
    res.status(404).json({
      error:
        'مسیر موردنظر پیدا نشد',
    });
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {
    logger.error(
      'unhandled request error',
      err,
      {
        method: req.method,
        path: req.path,
      }
    );

    if (
      String(
        err.message || ''
      ).startsWith(
        'CORS origin not allowed'
      )
    ) {
      return res.status(403).json({
        error:
          'Origin درخواست مجاز نیست',

        origin:
          req.get('origin') || null,
      });
    }

    return res.status(500).json({
      error:
        'خطای داخلی سرور',
    });
  }
);

/* =========================================================
   VERCEL EXPORT
========================================================= */

module.exports = app;