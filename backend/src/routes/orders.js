'use strict';

const express = require('express');
const { z } = require('zod');
const { nanoid } = require('nanoid');

const db = require('../db');
const pricing = require('../pricing');
const zarinpal = require('../services/zarinpal');
const logger = require('../lib/logger');

const {
  requireAuth,
  requireSameOrigin,
} = require('../middleware');

const router = express.Router();

const WEIGHT_GRAMS = Object.freeze([250, 500, 1000]);

// =========================================================
// Validation helpers
// =========================================================

function numberFromInput(schema) {
  return z.preprocess(
    (value) => {
      if (
        typeof value === 'string' &&
        value.trim() !== ''
      ) {
        const converted = Number(value);

        return Number.isFinite(converted)
          ? converted
          : value;
      }

      return value;
    },
    schema,
  );
}

function integer(min, max) {
  let schema = z
    .number()
    .finite()
    .int()
    .min(min);

  if (max !== undefined) {
    schema = schema.max(max);
  }

  return numberFromInput(schema);
}

function decimal(min, max) {
  return numberFromInput(
    z
      .number()
      .finite()
      .min(min)
      .max(max),
  );
}

function normalizePhone(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\s-]/g, '');
}

// =========================================================
// Schemas
// =========================================================

const productLineSchema = z
  .object({
    kind: z.literal('product'),

    productId: z
      .string()
      .trim()
      .min(1)
      .max(80),

    grams: integer(250, 20000).refine(
      (value) => value % 250 === 0,
      {
        message:
          'وزن باید مضربی از ۲۵۰ گرم باشد',
      },
    ),

    qty: integer(1, 50),
  })
  .strict();

const blendComponentSchema = z
  .object({
    productId: z
      .string()
      .trim()
      .min(1)
      .max(80),

    pct: decimal(0, 100),
  })
  .strict();

const blendLineSchema = z
  .object({
    kind: z.literal('blend'),

    name: z
      .string()
      .trim()
      .min(1, {
        message:
          'وارد کردن نام میکس الزامی است',
      })
      .max(60, {
        message:
          'نام میکس نباید بیشتر از ۶۰ کاراکتر باشد',
      })
      .optional(),

    weightIdx: integer(
      0,
      WEIGHT_GRAMS.length - 1,
    ),

    mix: z
      .array(blendComponentSchema)
      .min(2, {
        message:
          'میکس باید حداقل شامل دو محصول باشد',
      })
      .max(3, {
        message:
          'میکس حداکثر می‌تواند سه محصول داشته باشد',
      }),

    qty: integer(1, 50),
  })
  .strict();

const customerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, {
        message:
          'وارد کردن نام الزامی است',
      })
      .max(80, {
        message:
          'نام نباید بیشتر از ۸۰ کاراکتر باشد',
      }),

    phone: z
      .string()
      .transform(normalizePhone)
      .refine(
        (value) => /^09\d{9}$/.test(value),
        {
          message:
            'شماره موبایل نامعتبر است',
        },
      ),

    address: z
      .string()
      .trim()
      .min(5, {
        message:
          'آدرس باید حداقل ۵ کاراکتر باشد',
      })
      .max(500, {
        message:
          'آدرس نباید بیشتر از ۵۰۰ کاراکتر باشد',
      }),
  })
  .strict();

const nestedOrderSchema = z
  .object({
    customer: customerSchema,

    items: z
      .array(
        z.union([
          productLineSchema,
          blendLineSchema,
        ]),
      )
      .min(1, {
        message:
          'حداقل یک محصول باید انتخاب شود',
      })
      .max(30, {
        message:
          'تعداد آیتم‌های سفارش بیش از حد مجاز است',
      }),
  })
  .strict();

const flatOrderSchema = z
  .object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),

    items: z
      .array(
        z.union([
          productLineSchema,
          blendLineSchema,
        ]),
      )
      .min(1)
      .max(30),
  })
  .strict()
  .transform((data) => ({
    customer: {
      name: data.name,
      phone: data.phone,
      address: data.address,
    },
    items: data.items,
  }))
  .pipe(nestedOrderSchema);

function parseOrderBody(body) {
  const nested = nestedOrderSchema.safeParse(body);

  if (nested.success) {
    return nested;
  }

  return flatOrderSchema.safeParse(body);
}

// =========================================================
// Products
// =========================================================

function loadProductsForItems(items) {
  const ids = new Set();

  for (const item of items) {
    if (item.kind === 'product') {
      ids.add(item.productId);
      continue;
    }

    for (const component of item.mix) {
      ids.add(component.productId);
    }
  }

  if (ids.size === 0) {
    return new Map();
  }

  const productIds = [...ids];
  const placeholders = productIds.map(() => '?').join(',');

  const rows = db
    .prepare(
      `SELECT
        id,
        name,
        price,
        stock_grams,
        active
       FROM products
       WHERE id IN (${placeholders})
         AND active = 1`,
    )
    .all(...productIds);

  return new Map(
    rows.map((product) => [product.id, product]),
  );
}

// =========================================================
// Pricing
// =========================================================

function priceOrder(items, productsById) {
  const gramsNeededByProduct = new Map();
  const lines = [];

  let total = 0;

  function addRequiredGrams(productId, grams) {
    const current =
      gramsNeededByProduct.get(productId) || 0;

    gramsNeededByProduct.set(
      productId,
      current + grams,
    );
  }

  for (const item of items) {
    // -----------------------------------------------------
    // Product
    // -----------------------------------------------------

    if (item.kind === 'product') {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const gramsTotal = item.grams * item.qty;

      addRequiredGrams(
        item.productId,
        gramsTotal,
      );

      const unitPrice = pricing.priceForGrams(
        product.price,
        item.grams,
      );

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice <= 0
      ) {
        throw new Error('INVALID_PRODUCT_PRICE');
      }

      total += unitPrice * item.qty;

      lines.push({
        kind: 'product',
        name: product.name,
        weightLabel: formatGrams(item.grams),
        meta: null,
        gramsTotal,
        unitPrice,
        qty: item.qty,

        composition: JSON.stringify([
          {
            productId: item.productId,
            pct: 100,
            grams: gramsTotal,
          },
        ]),
      });

      continue;
    }

    // -----------------------------------------------------
    // Blend
    // -----------------------------------------------------

    const uniqueProductIds = new Set(
      item.mix.map(
        (component) => component.productId,
      ),
    );

    if (
      uniqueProductIds.size !== item.mix.length
    ) {
      throw new Error(
        'DUPLICATE_BLEND_PRODUCT',
      );
    }

    const percentageTotal = item.mix.reduce(
      (sum, component) => sum + component.pct,
      0,
    );

    if (
      !Number.isFinite(percentageTotal) ||
      Math.abs(percentageTotal - 100) > 0.01
    ) {
      throw new Error(
        'INVALID_BLEND_PERCENTAGES',
      );
    }

    for (const component of item.mix) {
      if (
        !productsById.has(component.productId)
      ) {
        throw new Error('PRODUCT_NOT_FOUND');
      }
    }

    const unitPrice = pricing.computeMixPrice(
      item.mix,
      productsById,
      item.weightIdx,
    );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      throw new Error('INVALID_BLEND_PRICE');
    }

    const gramsPerUnit =
      WEIGHT_GRAMS[item.weightIdx];

    const gramsTotal =
      gramsPerUnit * item.qty;

    total += unitPrice * item.qty;

    // Largest remainder allocation
    const allocations = item.mix.map(
      (component, index) => ({
        productId: component.productId,
        pct: component.pct,
        index,
        raw:
          gramsTotal *
          (component.pct / 100),
      }),
    );

    const compositionGrams = allocations.map(
      (entry) => Math.floor(entry.raw),
    );

    const allocatedGrams =
      compositionGrams.reduce(
        (sum, grams) => sum + grams,
        0,
      );

    let remaining =
      gramsTotal - allocatedGrams;

    const orderedRemainders =
      [...allocations].sort(
        (a, b) => {
          const remainderA =
            a.raw - Math.floor(a.raw);

          const remainderB =
            b.raw - Math.floor(b.raw);

          if (remainderA !== remainderB) {
            return remainderB - remainderA;
          }

          return a.index - b.index;
        },
      );

    for (
      let i = 0;
      i < remaining;
      i += 1
    ) {
      compositionGrams[
        orderedRemainders[i].index
      ] += 1;
    }

    const composition = item.mix.map(
      (component, index) => {
        const grams =
          compositionGrams[index];

        addRequiredGrams(
          component.productId,
          grams,
        );

        const product =
          productsById.get(
            component.productId,
          );

        return {
          productId: component.productId,
          pct: component.pct,
          grams,
          name: product.name,
        };
      },
    );

    lines.push({
      kind: 'blend',

      name:
        item.name ||
        'میکس شخصی',

      weightLabel:
        pricing.weights[item.weightIdx].label,

      meta: composition
        .map(
          (component) =>
            `${component.pct}٪ ${component.name}`,
        )
        .join(' + '),

      gramsTotal,

      unitPrice,

      qty: item.qty,

      composition: JSON.stringify(
        composition.map(
          ({
            productId,
            pct,
            grams,
          }) => ({
            productId,
            pct,
            grams,
          }),
        ),
      ),
    });
  }

  if (
    !Number.isFinite(total) ||
    total <= 0
  ) {
    throw new Error('INVALID_ORDER_TOTAL');
  }

  return {
    lines,
    gramsNeededByProduct,
    total,
  };
}

// =========================================================
// Formatting
// =========================================================

function formatGrams(grams) {
  return grams >= 1000 && grams % 1000 === 0
    ? `${grams / 1000} کیلوگرم`
    : `${grams} گرم`;
}

// =========================================================
// Public errors
// =========================================================

function getPublicOrderError(code) {
  const errors = {
    PRODUCT_NOT_FOUND:
      'یکی از محصولات انتخاب‌شده معتبر نیست',

    DUPLICATE_BLEND_PRODUCT:
      'هر محصول در میکس فقط یک‌بار می‌تواند انتخاب شود',

    INVALID_BLEND_PERCENTAGES:
      'درصدهای میکس باید مجموعاً ۱۰۰ باشد',

    INVALID_PRODUCT_PRICE:
      'قیمت یکی از محصولات نامعتبر است',

    INVALID_BLEND_PRICE:
      'قیمت میکس نامعتبر است',

    INVALID_ORDER_TOTAL:
      'مبلغ سفارش نامعتبر است',

    INVALID_STOCK_STATE:
      'وضعیت موجودی یکی از محصولات نامعتبر است',

    INVALID_GATEWAY_RESPONSE:
      'پاسخ درگاه پرداخت نامعتبر است',

    ORDER_AUTHORITY_UPDATE_FAILED:
      'ثبت اطلاعات پرداخت کامل نشد',
  };

  return (
    errors[code] ||
    'اطلاعات سفارش نامعتبر است'
  );
}

function safeLog(message, error, context = {}) {
  try {
    logger.error(
      message,
      error,
      context,
    );
  } catch {
    // Logging must never break the request.
  }
}

// =========================================================
// POST /api/orders
// =========================================================

router.post(
  '/',
  requireSameOrigin,
  requireAuth,
  async (req, res) => {
    const userId = req.user.id;

    // -----------------------------------------------------
    // Idempotency
    // -----------------------------------------------------

    const rawIdempotencyKey =
      req.get('Idempotency-Key');

    const idempotencyKey =
      rawIdempotencyKey?.trim() || null;

    if (
      idempotencyKey &&
      !/^[A-Za-z0-9_-]{16,128}$/.test(
        idempotencyKey,
      )
    ) {
      return res.status(400).json({
        error:
          'Idempotency-Key نامعتبر است',
      });
    }

    if (idempotencyKey) {
      const existing = db
        .prepare(
          `SELECT
            id,
            status,
            total_amount,
            zarinpal_authority
           FROM orders
           WHERE user_id = ?
             AND idempotency_key = ?`,
        )
        .get(
          userId,
          idempotencyKey,
        );

      if (existing) {
        if (
          existing.zarinpal_authority &&
          (
            existing.status ===
              'pending_payment' ||
            existing.status ===
              'processing_payment'
          )
        ) {
          return res.json({
            orderId: existing.id,
            total: existing.total_amount,
            paymentUrl:
              zarinpal.paymentUrlForAuthority(
                existing.zarinpal_authority,
              ),
          });
        }

        if (
          existing.status === 'failed' &&
          !existing.zarinpal_authority
        ) {
          db.prepare(
            `UPDATE orders
             SET idempotency_key = NULL
             WHERE id = ?
               AND status = 'failed'
               AND zarinpal_authority IS NULL`,
          ).run(existing.id);
        } else {
          return res.status(409).json({
            error:
              'این سفارش قبلاً پردازش شده است؛ برای تلاش دوباره سفارش جدید ایجاد کنید',
          });
        }
      }
    }

    // -----------------------------------------------------
    // Validate body
    // -----------------------------------------------------

    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        error:
          'بدنه درخواست خالی یا نامعتبر است',
      });
    }

    const parsed =
      parseOrderBody(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error:
          'ورودی نامعتبر است',
        details:
          parsed.error.flatten(),
      });
    }

    const {
      customer,
      items,
    } = parsed.data;

    // -----------------------------------------------------
    // Account phone
    // -----------------------------------------------------

    const accountPhone =
      normalizePhone(req.user.phone);

    if (
      !accountPhone ||
      customer.phone !== accountPhone
    ) {
      return res.status(400).json({
        error:
          'شماره تماس سفارش باید با شماره حساب کاربری یکسان باشد',
      });
    }

    // -----------------------------------------------------
    // Price + stock
    // -----------------------------------------------------

    let pricingResult;

    try {
      const productsById =
        loadProductsForItems(items);

      pricingResult =
        priceOrder(
          items,
          productsById,
        );

      for (
        const [
          productId,
          gramsNeeded,
        ] of pricingResult.gramsNeededByProduct
      ) {
        const product =
          productsById.get(productId);

        if (!product) {
          throw new Error(
            'PRODUCT_NOT_FOUND',
          );
        }

        if (
          !Number.isSafeInteger(
            product.stock_grams,
          ) ||
          product.stock_grams < 0
        ) {
          throw new Error(
            'INVALID_STOCK_STATE',
          );
        }

        if (
          gramsNeeded >
          product.stock_grams
        ) {
          return res.status(409).json({
            error:
              `موجودی «${product.name}» کافی نیست`,
            productId,
            available:
              product.stock_grams,
            requested:
              gramsNeeded,
          });
        }
      }
    } catch (err) {
      safeLog(
        'order pricing/validation failed',
        err,
        { userId },
      );

      return res.status(400).json({
        error:
          getPublicOrderError(
            err.message,
          ),
      });
    }

    const {
      lines,
      gramsNeededByProduct,
      total,
    } = pricingResult;

    // -----------------------------------------------------
    // Create order + reserve stock
    // -----------------------------------------------------

    const orderId =
      nanoid(12);

    try {
      const transaction =
        db.transaction(() => {
          for (
            const [
              productId,
              gramsNeeded,
            ] of gramsNeededByProduct
          ) {
            const result =
              db
                .prepare(
                  `UPDATE products
                   SET stock_grams =
                     stock_grams - ?
                   WHERE id = ?
                     AND active = 1
                     AND stock_grams >= ?`,
                )
                .run(
                  gramsNeeded,
                  productId,
                  gramsNeeded,
                );

            if (
              result.changes !== 1
            ) {
              throw new Error(
                'STOCK_CONFLICT',
              );
            }
          }

          db.prepare(
            `INSERT INTO orders (
              id,
              user_id,
              customer_name,
              customer_phone,
              customer_address,
              total_amount,
              status,
              idempotency_key
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              'pending_payment',
              ?
            )`,
          ).run(
            orderId,
            userId,
            customer.name,
            customer.phone,
            customer.address,
            total,
            idempotencyKey,
          );

          const insertItem =
            db.prepare(
              `INSERT INTO order_items (
                order_id,
                kind,
                name,
                weight_label,
                meta,
                grams_total,
                unit_price,
                qty,
                composition
              )
              VALUES (
                @orderId,
                @kind,
                @name,
                @weightLabel,
                @meta,
                @gramsTotal,
                @unitPrice,
                @qty,
                @composition
              )`,
            );

          for (const line of lines) {
            insertItem.run({
              orderId,
              ...line,
            });
          }
        });

      transaction();
    } catch (err) {
      if (
        err.message ===
        'STOCK_CONFLICT'
      ) {
        return res.status(409).json({
          error:
            'موجودی در لحظه ثبت سفارش تمام شد، لطفاً دوباره تلاش کنید',
        });
      }

      if (
        String(err.code || '').includes(
          'SQLITE_CONSTRAINT',
        ) &&
        idempotencyKey
      ) {
        const existing =
          db
            .prepare(
              `SELECT
                id,
                status,
                total_amount,
                zarinpal_authority
               FROM orders
               WHERE user_id = ?
                 AND idempotency_key = ?`,
            )
            .get(
              userId,
              idempotencyKey,
            );

        if (
          existing?.zarinpal_authority &&
          (
            existing.status ===
              'pending_payment' ||
            existing.status ===
              'processing_payment'
          )
        ) {
          return res.json({
            orderId:
              existing.id,
            total:
              existing.total_amount,
            paymentUrl:
              zarinpal.paymentUrlForAuthority(
                existing.zarinpal_authority,
              ),
          });
        }
      }

      safeLog(
        'order transaction failed',
        err,
        {
          orderId,
          userId,
        },
      );

      return res.status(500).json({
        error:
          'خطای داخلی سرور',
      });
    }

    // -----------------------------------------------------
    // Payment gateway
    // -----------------------------------------------------

    const callbackUrl =
      `${process.env.BACKEND_PUBLIC_URL}/api/payment/callback`;

    let gateway;

    try {
      gateway =
        await zarinpal.requestPayment({
          amountToman: total,

          description:
            `سفارش زندیه #${orderId}`,

          callbackUrl,

          mobile:
            customer.phone,
        });

      if (
        !gateway ||
        typeof gateway.url !==
          'string' ||
        gateway.url.length === 0 ||
        typeof gateway.authority !==
          'string' ||
        gateway.authority.length === 0
      ) {
        throw new Error(
          'INVALID_GATEWAY_RESPONSE',
        );
      }
    } catch (err) {
      safeLog(
        'zarinpal.requestPayment failed',
        err,
        {
          orderId,
          userId,
        },
      );

      try {
        const rollback =
          db.transaction(() => {
            for (
              const [
                productId,
                gramsNeeded,
              ] of gramsNeededByProduct
            ) {
              db.prepare(
                `UPDATE products
                 SET stock_grams =
                   stock_grams + ?
                 WHERE id = ?`,
              ).run(
                gramsNeeded,
                productId,
              );
            }

            db.prepare(
              `UPDATE orders
               SET status = 'failed'
               WHERE id = ?
                 AND status = 'pending_payment'`,
            ).run(orderId);
          });

        rollback();
      } catch (rollbackError) {
        safeLog(
          'order rollback failed',
          rollbackError,
          {
            orderId,
            userId,
          },
        );
      }

      return res.status(502).json({
        error:
          'اتصال به درگاه پرداخت ناموفق بود، لطفاً دوباره تلاش کنید',
      });
    }

    // -----------------------------------------------------
    // Save payment authority
    // -----------------------------------------------------

    try {
      const result =
        db
          .prepare(
            `UPDATE orders
             SET zarinpal_authority = ?
             WHERE id = ?
               AND status = 'pending_payment'`,
          )
          .run(
            gateway.authority,
            orderId,
          );

      if (
        result.changes !== 1
      ) {
        throw new Error(
          'ORDER_AUTHORITY_UPDATE_FAILED',
        );
      }
    } catch (err) {
      safeLog(
        'failed to persist payment authority',
        err,
        {
          orderId,
          userId,
        },
      );

      // Do not release stock here because
      // an external payment authority may already exist.

      return res.status(503).json({
        error:
          'پرداخت ایجاد شد اما ثبت سفارش کامل نشد؛ لطفاً با پشتیبانی تماس بگیرید',
      });
    }

    return res.json({
      orderId,
      total,
      paymentUrl: gateway.url,
    });
  },
);

// =========================================================
// GET /api/orders/mine
// =========================================================

router.get(
  '/mine',
  requireAuth,
  (req, res) => {
    const orders =
      db
        .prepare(
          `SELECT
            id,
            status,
            total_amount,
            zarinpal_ref_id,
            created_at,
            paid_at
           FROM orders
           WHERE user_id = ?
           ORDER BY created_at DESC`,
        )
        .all(req.user.id);

    return res.json({
      orders,
    });
  },
);

// =========================================================
// GET /api/orders/:id
// =========================================================

router.get(
  '/:id',
  requireAuth,
  (req, res) => {
    const order =
      db
        .prepare(
          `SELECT
            id,
            user_id,
            status,
            total_amount,
            zarinpal_ref_id,
            created_at,
            paid_at
           FROM orders
           WHERE id = ?`,
        )
        .get(req.params.id);

    if (!order) {
      return res.status(404).json({
        error:
          'سفارش پیدا نشد',
      });
    }

    if (
      order.user_id !==
      req.user.id
    ) {
      return res.status(403).json({
        error:
          'دسترسی به این سفارش مجاز نیست',
      });
    }

    const items =
      db
        .prepare(
          `SELECT
            kind,
            name,
            weight_label,
            meta,
            unit_price,
            qty
           FROM order_items
           WHERE order_id = ?`,
        )
        .all(req.params.id);

    return res.json({
      order,
      items,
    });
  },
);

// =========================================================
// Export
// =========================================================

module.exports = router;