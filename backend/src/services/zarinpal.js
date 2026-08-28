/**
 * Zarinpal REST API (v4) integration.
 * Docs: https://docs.zarinpal.com/paymentGateway/
 *
 * Zarinpal amounts are in Iranian Rial (IRR). Our product prices are stored
 * in Toman (تومان) everywhere else in this app, so every function here takes
 * a Toman amount and converts internally (1 Toman = 10 Rial). Never pass a
 * Rial amount into these functions.
 */

const SANDBOX = String(process.env.ZARINPAL_SANDBOX || 'true') === 'true';

const BASE_URL = SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/v4/payment'
  : 'https://payment.zarinpal.com/pg/v4/payment';

const STARTPAY_URL = SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/StartPay'
  : 'https://www.zarinpal.com/pg/StartPay';

const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID;
const REQUEST_TIMEOUT_MS = Math.max(1000, Number(process.env.ZARINPAL_TIMEOUT_MS || 15000));

function tomanToRial(toman) {
  return Math.round(toman) * 10;
}

/**
 * Starts a payment. Returns { authority, url } on success, throws on failure.
 */
async function requestPayment({ amountToman, description, callbackUrl, mobile, email }) {
  if (!MERCHANT_ID) {
    throw new Error('ZARINPAL_MERCHANT_ID is not set. Add it to your .env file.');
  }

  const res = await fetch(`${BASE_URL}/request.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount: tomanToRial(amountToman),
      description,
      callback_url: callbackUrl,
      metadata: { mobile, email },
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('پاسخ نامعتبر از درگاه پرداخت زرین‌پال دریافت شد');
  }

  if (data?.data?.code === 100 && data.data.authority) {
    return { authority: data.data.authority, url: paymentUrlForAuthority(data.data.authority) };
  }

  const errMessage = data?.errors?.message || 'خطای نامشخص از درگاه پرداخت زرین‌پال';
  const err = new Error(errMessage);
  err.zarinpalResponse = data;
  throw err;
}

/**
 * Verifies a payment after the user returns from Zarinpal.
 * Returns { ok: true, refId, cardPan } or { ok: false, message }.
 */
async function verifyPayment({ amountToman, authority }) {
  if (!MERCHANT_ID) {
    throw new Error('ZARINPAL_MERCHANT_ID is not set. Add it to your .env file.');
  }

  const res = await fetch(`${BASE_URL}/verify.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount: tomanToRial(amountToman),
      authority,
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('پاسخ نامعتبر از درگاه پرداخت زرین‌پال دریافت شد');
  }

  // code 100 = freshly verified now; code 101 = already verified earlier
  // (e.g. the user hit the callback URL twice) — both mean the payment is good.
  if (data?.data && (data.data.code === 100 || data.data.code === 101)) {
    return { ok: true, refId: String(data.data.ref_id), cardPan: data.data.card_pan };
  }

  return { ok: false, message: data?.errors?.message || 'پرداخت تأیید نشد' };
}

function paymentUrlForAuthority(authority) {
  return `${STARTPAY_URL}/${encodeURIComponent(String(authority))}`;
}

module.exports = { requestPayment, verifyPayment, tomanToRial, SANDBOX, paymentUrlForAuthority };
