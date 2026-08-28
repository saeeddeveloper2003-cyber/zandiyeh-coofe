# Production checklist

## Required environment
- Set `BACKEND_PUBLIC_URL` to the public backend URL. The server now validates it at startup.
- Set secure production secrets and database credentials.
- Use HTTPS in production.
- Set CORS/origin values to the exact frontend origin(s).
- Back up PostgreSQL and verify restore procedures.

## Payment reconciliation
The app includes a recovery job for old `processing_payment` orders.

Run periodically (for example every 5 minutes):

```bash
cd backend
npm run reconcile:payments
```

Recommended environment:
- `PAYMENT_RECONCILE_AGE_MINUTES=15`
- `PAYMENT_RECONCILE_LIMIT=50`

For the first deployment, inspect behavior without changing orders:

```bash
PAYMENT_RECONCILE_DRY_RUN=true npm run reconcile:payments
```

The job only checks orders older than the configured age and only marks an order as paid when the gateway verification reports a successful or already-verified payment. Unknown or transient failures remain unresolved for later retry instead of being cancelled automatically.

## Before launch
Test:
1. successful payment
2. cancelled/failed payment
3. repeated callback
4. repeated checkout request with the same idempotency key
5. server restart during payment processing
6. two users competing for low stock
7. reconciliation dry-run, then normal reconciliation on a controlled test order
