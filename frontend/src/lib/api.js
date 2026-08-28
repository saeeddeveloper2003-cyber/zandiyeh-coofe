'use strict';

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000'
).replace(/\/+$/, '');

class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const {
    headers = {},
    body,
    ...restOptions
  } = options;

  let res;

  try {
    res = await fetch(
      `${BASE_URL}${path}`,
      {
        ...restOptions,

        credentials: 'include',

        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...headers,
        },

        body,
      },
    );
  } catch (error) {
    console.error(
      'API request failed:',
      error,
    );

    throw new ApiError(
      'اتصال به سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.',
      0,
    );
  }

  let data = null;

  const contentType =
    res.headers.get('content-type') || '';

  if (
    contentType.includes('application/json')
  ) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await res.text();

      if (text) {
        data = {
          error: text,
        };
      }
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error ||
        'خطای غیرمنتظره‌ای رخ داد',
      res.status,
      data?.details || null,
    );
  }

  return data;
}

/* =========================================================
   Products
========================================================= */

export function fetchProducts() {
  return request('/api/products');
}

/* =========================================================
   Authentication
========================================================= */

export function fetchMe() {
  return request('/api/auth/me');
}

export function register(payload) {
  return request(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function login(payload) {
  return request(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function logout() {
  return request(
    '/api/auth/logout',
    {
      method: 'POST',
    },
  );
}

export function updateProfile(payload) {
  return request(
    '/api/auth/me',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

/* =========================================================
   Orders
========================================================= */

export function fetchMyOrders() {
  return request('/api/orders/mine');
}

export function fetchOrder(orderId) {
  if (!orderId) {
    throw new ApiError(
      'شناسه سفارش نامعتبر است',
      400,
    );
  }

  return request(
    `/api/orders/${encodeURIComponent(orderId)}`,
  );
}

/*
 * items:
 *
 * [
 *   {
 *     kind: 'product',
 *     productId,
 *     grams,
 *     qty
 *   },
 *
 *   {
 *     kind: 'blend',
 *     name,
 *     weightIdx,
 *     mix,
 *     qty
 *   }
 * ]
 */

export function createOrder(
  { customer, items },
  idempotencyKey = null,
) {
  if (
    !customer ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new ApiError(
      'اطلاعات سفارش ناقص است',
      400,
    );
  }

  const key =
    idempotencyKey ||
    crypto.randomUUID();

  const payload = {
    customer,
    items,
  };

  /*
   * لاگ کامل customer را چاپ نمی‌کنیم تا
   * شماره موبایل و آدرس در console نماند.
   */
  console.debug(
    'Creating order:',
    {
      itemsCount: items.length,
      idempotencyKey: key,
    },
  );

  return request(
    '/api/orders',
    {
      method: 'POST',

      headers: {
        'Idempotency-Key': key,
      },

      body: JSON.stringify(payload),
    },
  );
}

/* =========================================================
   Admin
========================================================= */

export function fetchAdminOrders({
  status,
  q,
  limit = 50,
  offset = 0,
} = {}) {
  const params =
    new URLSearchParams();

  if (status) {
    params.set(
      'status',
      status,
    );
  }

  if (q) {
    params.set(
      'q',
      q,
    );
  }

  params.set(
    'limit',
    String(limit),
  );

  params.set(
    'offset',
    String(offset),
  );

  return request(
    `/api/admin/orders?${params.toString()}`,
  );
}

export function fetchAdminOrder(orderId) {
  if (!orderId) {
    throw new ApiError(
      'شناسه سفارش نامعتبر است',
      400,
    );
  }

  return request(
    `/api/admin/orders/${encodeURIComponent(orderId)}`,
  );
}

export { ApiError };