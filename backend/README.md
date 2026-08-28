# Zandieh Backend

Backend service for the Zandieh coffee bean store. Built with Node.js, Express, and SQLite, with a real integration to the ZarinPal payment gateway.

## Running the Project

```bash
npm install
cp .env.example .env
# Open .env and replace ZARINPAL_MERCHANT_ID with your actual merchant ID.
npm run dev
```

The server runs on:

```text
http://localhost:4000
```

On the first run, the SQLite database (`zandieh.db`) is created automatically and seeded with 10 products matching the frontend, including inventory information.

## Project Structure

```text
src/
  server.js
  db.js
  pricing.js
  data/
    seed-products.js
  routes/
    products.js
    orders.js
    payment.js
  services/
    zarinpal.js
```

### Main Files

- `server.js` — Express application entry point
- `db.js` — SQLite database schema and seed data
- `pricing.js` — Server-side pricing logic
- `seed-products.js` — Initial product data
- `products.js` — Product API routes
- `orders.js` — Order creation and retrieval
- `payment.js` — ZarinPal payment callback
- `zarinpal.js` — Payment request and verification

## Key Design Decisions

### Server-Side Pricing

**Prices are never trusted from the client.**

The frontend sends product identifiers and quantities such as:

```text
productId
grams
qty
```

For blends, it sends:

```text
productId
pct
mix
```

The server recalculates the final price using `pricing.js`. This prevents client-side price manipulation.

### Atomic Inventory Handling

Inventory is reserved atomically inside the SQLite transaction used by `POST /api/orders`.

The inventory update uses a condition equivalent to:

```sql
WHERE stock_grams >= ?
```

If multiple customers attempt to purchase the same limited-stock product simultaneously, only one can reserve the available inventory. The other receives `409 Conflict`, preventing overselling.

### Payment Gateway Failure Handling

If a request to ZarinPal fails or times out:

- Reserved inventory is released.
- The order is marked as `failed`.

If payment verification fails temporarily:

- The order is not immediately cancelled.
- It can return to `pending_payment`.
- This prevents a legitimate payment from being lost because of a temporary gateway or network problem.

### Cancelled or Failed Payments

If ZarinPal returns:

```text
Status=NOK
```

or verification fails, the reserved inventory is released according to the order state.

## API

### `GET /api/products`

Returns available products including:

```json
{
  "stockGrams": 5000,
  "inStock": true
}
```

### `POST /api/orders`

Example:

```json
{
  "customer": {
    "name": "John Doe",
    "phone": "09xxxxxxxxx",
    "address": "Example address"
  },
  "items": [
    {
      "kind": "product",
      "productId": "p1",
      "grams": 500,
      "qty": 2
    },
    {
      "kind": "blend",
      "weightIdx": 0,
      "mix": [
        { "productId": "p7", "pct": 60 },
        { "productId": "p5", "pct": 40 }
      ],
      "qty": 1,
      "name": "Test Blend"
    }
  ]
}
```

Successful response:

```json
{
  "orderId": "...",
  "total": 0,
  "paymentUrl": "..."
}
```

The frontend redirects the customer to:

```js
window.location.href = paymentUrl;
```

Possible responses:

```text
400 — Invalid input
409 — Insufficient inventory
502 — Payment gateway unavailable
```

### `GET /api/orders/:id`

Returns the current status of an order. This is used by the frontend after the customer returns from ZarinPal.

### `GET /api/payment/callback`

This endpoint is called by ZarinPal, not directly by the frontend.

After payment processing, the customer is redirected to:

```text
{FRONTEND_PUBLIC_URL}/checkout/result?status=success|failed|canceled|error&orderId=...
```

The frontend provides a `/checkout/result` page that reads these parameters and displays the appropriate result.

# Frontend Integration

The existing frontend is already connected to this backend.

- `src/lib/api.js` — centralized API/fetch layer using `VITE_API_BASE_URL`
- `src/hooks/useProducts.js` — fetches products from `GET /api/products`
- `Products.jsx` and `BlendBuilder.jsx` — loading, skeleton, error, and retry states
- `ProductCard.jsx` — disables Add to Cart when `inStock === false`
- `CheckoutModal.jsx` — creates orders through the backend and redirects to ZarinPal
- `src/pages/CheckoutResult.jsx` — handles the return from ZarinPal
- `/checkout/result` in `main.jsx` — displays the final payment/order state

## Running Backend and Frontend

### Terminal 1

```bash
cd zandieh-backend
npm install
cp .env.example .env
npm run dev
```

### Terminal 2

From the frontend directory:

```bash
npm install
npm run dev
```

The default frontend API URL is:

```text
http://localhost:4000
```

You only need a frontend `.env` file if you want to use a different backend URL.

> **Deployment Note:** The production frontend server (for example Nginx) must provide SPA fallback for `/checkout/result` and route it to `index.html`. Without this, users returning from ZarinPal may receive a `404 Not Found`.

# Production Deployment

### ZarinPal Configuration

Set:

```text
ZARINPAL_SANDBOX=false
```

and use your real ZarinPal merchant ID.

`ZARINPAL_TIMEOUT_MS` controls the maximum time allowed for gateway requests.

If sandbox mode is disabled but the merchant ID is missing or still contains a sample value, the backend intentionally refuses to start.

### Public URLs

Set:

```text
BACKEND_PUBLIC_URL=https://api.example.com
FRONTEND_PUBLIC_URL=https://example.com
```

ZarinPal must be able to reach the backend callback through a publicly accessible URL.

Do not use `localhost` or `127.0.0.1` for production callbacks.

### Persistent Storage

**Do not deploy this SQLite backend to a stateless serverless environment** such as Vercel Functions or AWS Lambda.

The database is stored in:

```text
zandieh.db
```

and requires persistent filesystem storage.

Suitable options include:

- VPS
- Railway with persistent storage
- Render with a persistent disk
- Docker with a mounted persistent volume

SQLite is suitable for the current scale. If traffic grows significantly or the application requires multiple backend instances, PostgreSQL is recommended.

## Database Backups

Create backups using:

```bash
npm run backup
```

or:

```bash
node scripts/backup-db.js /path/to/backups
```

The backup system uses the online backup functionality of `better-sqlite3`.

A daily scheduled backup using cron or another scheduler is recommended.

## Security

The backend includes:

- `helmet` security headers
- API rate limiting
- Stricter rate limiting for order creation
- Parameterized SQL queries
- Server-side price calculation
- Server-side inventory validation
- Secure session handling
- Password hashing with Node.js `scrypt`
- `HttpOnly` session cookies
- Same-origin protection for sensitive requests
- Idempotent payment handling
- Payment timeout protection

### Reverse Proxy

When running behind a trusted reverse proxy or load balancer, set:

```text
TRUST_PROXY=true
```

Only enable this when the backend is actually behind your trusted proxy. This allows Express to correctly determine the client IP address for rate limiting.

# Authentication

The backend uses server-side sessions stored in SQLite.

Passwords are hashed using Node.js's built-in `scrypt`.

The raw session token is never stored directly in the database. Only a SHA-256 digest of the token is stored.

The raw token is sent to the client through an `HttpOnly` cookie.

## Authentication Endpoints

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/me
GET    /api/orders/mine
```

Orders require an authenticated session and are associated with:

```text
orders.user_id
```

A user cannot retrieve another user's order simply by guessing an order ID.

## Production Authentication Settings

For production:

```text
NODE_ENV=production
```

Use HTTPS.

Set:

```text
FRONTEND_PUBLIC_URL=https://your-frontend-domain.com
```

### Session Cookie SameSite

Use:

```text
SESSION_COOKIE_SAMESITE=lax
```

when the frontend and backend are on the same site or a normal same-site deployment is sufficient.

Use:

```text
SESSION_COOKIE_SAMESITE=none
```

**only when the frontend and backend are hosted on different sites and cross-site cookies are actually required.**

When using `SameSite=None`, HTTPS is required because browsers require the `Secure` attribute for such cookies.

### Trusted Proxy

Only use:

```text
TRUST_PROXY=true
```

when the backend is directly behind a trusted reverse proxy.

The frontend API client already uses:

```js
credentials: "include"
```

so authenticated requests automatically include the session cookie.

# Payment Recovery / Reconciliation

The backend includes a payment reconciliation job for orders that remain stuck in:

```text
processing_payment
```

for longer than the configured recovery interval.

Run:

```bash
npm run reconcile:payments
```

Recommended configuration:

```text
PAYMENT_RECONCILE_AGE_MINUTES=15
PAYMENT_RECONCILE_LIMIT=50
```

For an initial dry run:

```bash
PAYMENT_RECONCILE_DRY_RUN=true npm run reconcile:payments
```

The reconciliation process:

1. Finds sufficiently old `processing_payment` orders.
2. Checks the payment status with ZarinPal.
3. Marks successfully verified payments as `paid`.
4. Treats already-verified payments as successful.
5. Leaves unknown or temporary failures unresolved for a later retry.
6. Does not automatically cancel an order based only on an unknown gateway response.

Run the reconciliation job periodically, for example every five minutes using cron or another scheduler.

# Production Checklist

Before launching the store, verify:

- `NODE_ENV=production`
- `ZARINPAL_SANDBOX=false`
- Real ZarinPal merchant ID configured
- `BACKEND_PUBLIC_URL` is publicly accessible
- `FRONTEND_PUBLIC_URL` uses the correct production domain
- HTTPS is enabled
- CORS/origin settings match the actual frontend
- Persistent storage is configured for SQLite
- Database backups are working
- `/checkout/result` has SPA fallback configured
- `TRUST_PROXY` is enabled only behind a trusted proxy
- Payment reconciliation is scheduled
- Successful payment has been tested
- Failed payment has been tested
- Cancelled payment has been tested
- Duplicate callbacks have been tested
- Repeated checkout attempts have been tested
- Concurrent low-stock purchases have been tested
- Server restart during payment processing has been tested

With these settings in place, the backend is suitable for a production deployment with the current SQLite-based architecture.