import React from 'react';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchOrder, ApiError } from '../lib/api';
import { formatToman } from '../data/products';

function readParams() {
  const params = new URLSearchParams(window.location.search);
  return { status: params.get('status'), orderId: params.get('orderId') };
}

const STATUS_CONTENT = {
  success: { icon: CheckCircle2, color: 'text-[#e3c081]', bg: 'bg-[#c9a26a]/10', title: 'پرداخت با موفقیت انجام شد', body: 'سفارش شما ثبت شد و به‌زودی برای ارسال آماده می‌شود.' },
  failed: { icon: XCircle, color: 'text-[#ef8f7b]', bg: 'bg-[#ef8f7b]/10', title: 'پرداخت ناموفق بود', body: 'مبلغ از حساب شما کسر نشد. می‌توانید دوباره تلاش کنید.' },
  canceled: { icon: XCircle, color: 'text-[#ef8f7b]', bg: 'bg-[#ef8f7b]/10', title: 'پرداخت لغو شد', body: 'سفارش شما لغو شد و کالاها به انبار بازگشتند.' },
  processing: { icon: Loader2, color: 'text-[#c9a26a]', bg: 'bg-[#c9a26a]/10', title: 'در حال بررسی پرداخت', body: 'پرداخت شما در حال بررسی است؛ لطفاً چند لحظه بعد دوباره این صفحه را باز کنید.' },
  error: { icon: AlertTriangle, color: 'text-[#ef8f7b]', bg: 'bg-[#ef8f7b]/10', title: 'خطایی رخ داد', body: 'وضعیت پرداخت مشخص نشد. لطفاً با پشتیبانی تماس بگیرید.' },
};

export default function CheckoutResult() {
  const [{ status, orderId }] = useState(readParams);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    fetchOrder(orderId)
      .then((data) => setOrder(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'خطا در دریافت وضعیت سفارش'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const content = STATUS_CONTENT[status] || STATUS_CONTENT.error;
  const Icon = content.icon;

  return (
    <div className="grain relative flex min-h-screen items-center justify-center bg-[#070908] px-5 text-[#f3eada]">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111313] p-8 text-center shadow-2xl">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${content.bg} ${content.color}`}>
          <Icon size={34} />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">{content.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#93aa9c]">{content.body}</p>

        {orderId && (
          <div className="mt-6 rounded-2xl border border-white/8 bg-black/20 p-4 text-right text-sm">
            <div className="flex items-center justify-between text-xs text-[#93aa9c]">
              <span>شماره سفارش</span>
              <span dir="ltr">{orderId}</span>
            </div>
            {loading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#93aa9c]">
                <Loader2 size={14} className="animate-spin" /> در حال دریافت جزئیات...
              </div>
            )}
            {!loading && error && <p className="mt-3 text-xs text-[#ef8f7b]">{error}</p>}
            {!loading && order && (
              <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                <span className="text-[#93aa9c]">مبلغ</span>
                <strong className="text-[#e3c081]">{formatToman(order.order.total_amount)}</strong>
              </div>
            )}
          </div>
        )}

        <a href="/" className="mt-7 inline-block rounded-full bg-[#c9a26a] px-7 py-3 font-bold text-[#0a0a0b] hover:bg-[#e3c081]">
          بازگشت به فروشگاه
        </a>
      </div>
    </div>
  );
}
