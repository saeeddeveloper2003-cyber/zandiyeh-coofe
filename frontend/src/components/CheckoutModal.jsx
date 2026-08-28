import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { formatToman } from '../data/products';
import { createOrder, ApiError } from '../lib/api';

const toEnglishDigits = (value) => value
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const getFocusable = (root) => root?.querySelectorAll(
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
) ?? [];

// Cart entries carry client-side display data (unitPrice, weightLabel...) but
// the backend only trusts productId/grams or mix/weightIdx — everything else
// gets recomputed server-side. This just reshapes each cart line into what
// POST /api/orders expects.
function buildOrderItems(items) {
  const lines = [];
  const skipped = [];
  for (const [, item] of items) {
    if (item.kind === 'product' && item.productId && item.grams) {
      lines.push({ kind: 'product', productId: item.productId, grams: item.grams, qty: item.qty });
    } else if (item.kind === 'blend' && Array.isArray(item.mix) && typeof item.weightIdx === 'number') {
      lines.push({ kind: 'blend', name: item.name, weightIdx: item.weightIdx, mix: item.mix, qty: item.qty });
    } else {
      skipped.push(item);
    }
  }
  return { lines, skipped };
}

export default function CheckoutModal({ open, onClose, total, items, user, onOrderPlaced }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const requestKeyRef = useRef(null);

  useEffect(() => {
    if (!open || !user) return;
    setForm({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
    setErrors({});
    setServerError('');
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(getFocusable(dialogRef.current));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      if (previousActive instanceof HTMLElement) previousActive.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');

    const name = form.name.trim();
    const phone = toEnglishDigits(form.phone.trim());
    const address = form.address.trim();
    const nextErrors = {};

    if (!name) nextErrors.name = 'وارد کردن نام الزامی است';
    if (!phone) nextErrors.phone = 'وارد کردن شماره تماس الزامی است';
    else if (!/^09\d{9}$/.test(phone)) nextErrors.phone = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود';
    if (!address) nextErrors.address = 'وارد کردن آدرس الزامی است';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const { lines, skipped } = buildOrderItems(items);
    if (!lines.length || skipped.length) {
      setServerError('بعضی از اقلام سبد خرید دیگر معتبر نیستند. لطفاً اقلام مشکل‌دار را حذف و دوباره اضافه کنید.');
      return;
    }

    if (!requestKeyRef.current) requestKeyRef.current = crypto.randomUUID();

    setSubmitting(true);
    try {
      const data = await createOrder(
        { customer: { name, phone, address }, items: lines },
        requestKeyRef.current,
      );
      // Order is created and stock reserved server-side at this point, so
      // it's safe to clear the local cart before leaving for the gateway.
      onOrderPlaced();
      requestKeyRef.current = null;
      window.location.href = data.paymentUrl;
      // No need to reset submitting/close here — we're navigating away.
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.status === 502) requestKeyRef.current = null;
      if (err instanceof ApiError) {
        // The backend returns a generic "ورودی نامعتبر است" for any schema
        // validation failure (400), plus `details.fieldErrors` describing
        // exactly which top-level field (customer/items) failed and why —
        // e.g. a name/address longer than the backend's max length. Surface
        // that instead of the dead-end generic message so the person knows
        // what to fix.
        const fieldErrors = err.details?.fieldErrors;
        if (fieldErrors?.customer?.length) {
          setServerError(fieldErrors.customer.join('؛ '));
        } else if (fieldErrors?.items?.length) {
          setServerError('اطلاعات اقلام سبد خرید نامعتبر است؛ لطفاً سبد خرید را بررسی و دوباره تلاش کنید.');
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.');
      }
    }
  };

  const close = () => {
    if (submitting) return;
    setErrors({});
    setServerError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl border border-white/10 bg-[#111313] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeButtonRef} type="button" onClick={close} disabled={submitting} aria-label="بستن پنجره" className="absolute left-4 top-4 rounded-xl p-2 text-[#93aa9c] hover:bg-white/5 disabled:opacity-40">
          <X size={20} />
        </button>

        <form onSubmit={submit} className="p-7 sm:p-8">
          <div className="mb-7">
            <p className="text-xs text-[#c9a26a]">تکمیل سفارش</p>
            <h3 id="checkout-title" className="mt-2 text-2xl font-extrabold">اطلاعات ارسال</h3>
            <p className="mt-2 text-sm text-[#93aa9c]">اطلاعات ارسال را بررسی کنید؛ حساب کاربری شما مالک این سفارش خواهد بود.</p>
          </div>
          <div className="space-y-4">
            {[
              // maxLength on each field must match the backend's zod limits
              // (customer.name/address in backend/src/routes/orders.js) —
              // otherwise a value the UI happily accepts gets rejected
              // wholesale at checkout with only a generic "ورودی نامعتبر
              // است" and no indication which field (or why) failed.
              ['name', 'نام و نام خانوادگی', 'مثلاً علی رضایی', 'text', 80],
              ['phone', 'شماره تماس', '۰۹۱۲۱۲۳۴۵۶۷', 'tel', 11],
            ].map(([key, label, placeholder, type, maxLength]) => (
              <label key={key} className="block text-sm font-semibold">
                {label}
                <input
                  aria-invalid={Boolean(errors[key])}
                  name={key}
                  type={type}
                  value={form[key]}
                  maxLength={maxLength}
                  disabled={submitting || key === 'phone'}
                  onChange={(event) => setForm((state) => ({ ...state, [key]: event.target.value }))}
                  placeholder={placeholder}
                  className={`mt-2 w-full rounded-2xl border bg-black/20 px-4 py-3 text-sm outline-none disabled:opacity-50 ${errors[key] ? 'border-[#ef8f7b]' : 'border-white/10 focus:border-[#c9a26a]'}`}
                />
                {errors[key] && <span className="mt-1 block text-xs text-[#ef8f7b]">{errors[key]}</span>}
              </label>
            ))}
            <label className="block text-sm font-semibold">
              آدرس کامل
              <textarea
                aria-invalid={Boolean(errors.address)}
                name="address"
                value={form.address}
                disabled={submitting}
                onChange={(event) => setForm((state) => ({ ...state, address: event.target.value }))}
                placeholder="شهر، خیابان، پلاک..."
                rows="4"
                maxLength={500}
                className={`mt-2 w-full resize-none rounded-2xl border bg-black/20 px-4 py-3 text-sm outline-none disabled:opacity-50 ${errors.address ? 'border-[#ef8f7b]' : 'border-white/10 focus:border-[#c9a26a]'}`}
              />
              {errors.address && <span className="mt-1 block text-xs text-[#ef8f7b]">{errors.address}</span>}
            </label>
          </div>

          {serverError && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-[#ef8f7b]/25 bg-[#ef8f7b]/5 p-4 text-xs leading-6 text-[#f3eada]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#ef8f7b]" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
            <span className="text-sm text-[#93aa9c]">مبلغ قابل پرداخت (تقریبی)</span>
            <strong className="text-xl text-[#e3c081]">{formatToman(total)}</strong>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c9a26a] py-3 font-bold text-[#0a0a0b] hover:bg-[#e3c081] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'در حال انتقال به درگاه پرداخت...' : 'ادامه و پرداخت با زرین‌پال'}
          </button>
        </form>
      </div>
    </div>
  );
}
