'use strict';

const express = require('express');
const { z } = require('zod');

const db = require('../db');
const {
  requireAuth,
  requireAdmin,
} = require('../middleware');

const router = express.Router();

/*
 * تمام endpointهای ادمین:
 * - کاربر باید لاگین باشد
 * - role باید admin باشد
 */
router.use(
  requireAuth,
  requireAdmin,
);

const ORDER_STATUSES = [
  'pending_payment',
  'processing_payment',
  'paid',
  'failed',
  'canceled',
];

/* =========================================================
   Validation
========================================================= */

const listQuerySchema = z.object({
  status: z
    .enum(ORDER_STATUSES)
    .optional(),

  q: z
    .string()
    .trim()
    .max(80)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .max(1000000)
    .default(0),
});

/* =========================================================
   Helpers
========================================================= */

function escapeLike(value) {
  return value.replace(
    /[%_\\]/g,
    (char) => `\\${char}`,
  );
}

/* =========================================================
   GET /api/admin/orders
========================================================= */

router.get(
  '/orders',
  (req, res) => {
    const parsed =
      listQuerySchema.safeParse(
        req.query,
      );

    if (!parsed.success) {
      return res.status(400).json({
        error:
          'پارامترهای جستجو نامعتبر است',
      });
    }

    const {
      status,
      q,
      limit,
      offset,
    } = parsed.data;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(
        'status = ?',
      );

      params.push(status);
    }

    if (q) {
      const escaped =
        escapeLike(q);

      conditions.push(
        `(
          customer_name LIKE ? ESCAPE '\\'
          OR customer_phone LIKE ? ESCAPE '\\'
        )`,
      );

      params.push(
        `%${escaped}%`,
        `%${escaped}%`,
      );
    }

    const where =
      conditions.length > 0
        ? `WHERE ${conditions.join(
            ' AND ',
          )}`
        : '';

    const orders =
      db
        .prepare(
          `SELECT
             id,
             customer_name,
             customer_phone,
             total_amount,
             status,
             zarinpal_ref_id,
             created_at,
             paid_at
           FROM orders
           ${where}
           ORDER BY created_at DESC
           LIMIT ?
           OFFSET ?`,
        )
        .all(
          ...params,
          limit,
          offset,
        );

    const total =
      db
        .prepare(
          `SELECT
             COUNT(*) AS count
           FROM orders
           ${where}`,
        )
        .get(...params)
        .count;

    /*
     * تعداد سفارش‌ها بر اساس وضعیت
     */
    const counts = Object.fromEntries(
      ORDER_STATUSES.map(
        (orderStatus) => [
          orderStatus,
          db
            .prepare(
              `SELECT
                 COUNT(*) AS count
               FROM orders
               WHERE status = ?`,
            )
            .get(orderStatus)
            .count,
        ],
      ),
    );

    return res.json({
      orders,
      total,
      counts,
      limit,
      offset,
    });
  },
);

/* =========================================================
   GET /api/admin/orders/:id
========================================================= */

router.get(
  '/orders/:id',
  (req, res) => {
    const orderId =
      String(req.params.id || '')
        .trim();

    if (!orderId || orderId.length > 100) {
      return res.status(400).json({
        error:
          'شناسه سفارش نامعتبر است',
      });
    }

    const order =
      db
        .prepare(
          `SELECT
             id,
             user_id,
             customer_name,
             customer_phone,
             customer_address,
             total_amount,
             status,
             zarinpal_authority,
             zarinpal_ref_id,
             created_at,
             paid_at
           FROM orders
           WHERE id = ?`,
        )
        .get(orderId);

    if (!order) {
      return res.status(404).json({
        error:
          'سفارش پیدا نشد',
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
             grams_total,
             unit_price,
             qty
           FROM order_items
           WHERE order_id = ?`,
        )
        .all(orderId);

    return res.json({
      order,
      items,
    });
  },
);

module.exports = router;