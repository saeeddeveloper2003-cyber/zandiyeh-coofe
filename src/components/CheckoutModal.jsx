import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { formatToman } from '../data/products';

const toEnglishDigits = (value) => value
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const getFocusable = (root) => root?.querySelectorAll(
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
) ?? [];

export default function CheckoutModal({ open, onClose, total, onSuccess }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

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

  const submit = (event) => {
    event.preventDefault();
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
    onSuccess();
    setDone(true);
  };

  const close = () => {
    setDone(false);
    setErrors({});
    setForm({ name: '', phone: '', address: '' });
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
        aria-labelledby={done ? 'checkout-success-title' : 'checkout-title'}
        className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl border border-white/10 bg-[#111313] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeButtonRef} type="button" onClick={close} aria-label="بستن پنجره" className="absolute left-4 top-4 rounded-xl p-2 text-[#93aa9c] hover:bg-white/5">
          <X size={20} />
        </button>

        {done ? (
          <div className="px-7 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#c9a26a]/10 text-[#e3c081]">
              <CheckCircle2 size={34} />
            </div>
            <h3 id="checkout-success-title" className="mt-6 text-2xl font-extrabold">سفارش شما ثبت شد</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#93aa9c]">این نسخه یک پیش‌نمایش فرانت‌اند است و فعلاً به درگاه پرداخت واقعی متصل نیست.</p>
            <button type="button" onClick={close} className="mt-7 rounded-full bg-[#c9a26a] px-7 py-3 font-bold text-[#0a0a0b]">بستن</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-7 sm:p-8">
            <div className="mb-7">
              <p className="text-xs text-[#c9a26a]">تکمیل سفارش</p>
              <h3 id="checkout-title" className="mt-2 text-2xl font-extrabold">اطلاعات ارسال</h3>
              <p className="mt-2 text-sm text-[#93aa9c]">اطلاعات خود را وارد کنید تا سفارش نمایشی ثبت شود.</p>
            </div>
            <div className="space-y-4">
              {[
                ['name', 'نام و نام خانوادگی', 'مثلاً علی رضایی', 'text'],
                ['phone', 'شماره تماس', '۰۹۱۲۱۲۳۴۵۶۷', 'tel'],
              ].map(([key, label, placeholder, type]) => (
                <label key={key} className="block text-sm font-semibold">
                  {label}
                  <input
                    aria-invalid={Boolean(errors[key])}
                    name={key}
                    type={type}
                    value={form[key]}
                    onChange={(event) => setForm((state) => ({ ...state, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className={`mt-2 w-full rounded-2xl border bg-black/20 px-4 py-3 text-sm outline-none ${errors[key] ? 'border-[#ef8f7b]' : 'border-white/10 focus:border-[#c9a26a]'}`}
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
                  onChange={(event) => setForm((state) => ({ ...state, address: event.target.value }))}
                  placeholder="شهر، خیابان، پلاک..."
                  rows="4"
                  className={`mt-2 w-full resize-none rounded-2xl border bg-black/20 px-4 py-3 text-sm outline-none ${errors.address ? 'border-[#ef8f7b]' : 'border-white/10 focus:border-[#c9a26a]'}`}
                />
                {errors.address && <span className="mt-1 block text-xs text-[#ef8f7b]">{errors.address}</span>}
              </label>
            </div>
            <div className="mt-6 rounded-2xl border border-[#c9a26a]/15 bg-[#c9a26a]/5 p-4 text-xs leading-6 text-[#93aa9c]"><b className="text-[#e3c081]">توجه:</b> درگاه پرداخت واقعی برای نسخه‌ی نهایی نیاز به بک‌اند و سرویس پرداخت دارد.</div>
            <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5"><span className="text-sm text-[#93aa9c]">مبلغ قابل پرداخت</span><strong className="text-xl text-[#e3c081]">{formatToman(total)}</strong></div>
            <button type="submit" className="mt-5 w-full rounded-2xl bg-[#c9a26a] py-3 font-bold text-[#0a0a0b] hover:bg-[#e3c081]">ثبت سفارش (نمایشی)</button>
          </form>
        )}
      </div>
    </div>
  );
}
