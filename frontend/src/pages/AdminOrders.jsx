import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAdminOrders, fetchAdminOrder, ApiError } from '../lib/api';

const toEnglishDigits = (value) => value
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const STATUS_LABELS = {
  pending_payment: 'در انتظار پرداخت',
  processing_payment: 'در حال پردازش پرداخت',
  paid: 'پرداخت‌شده',
  failed: 'ناموفق',
  canceled: 'لغوشده',
};

const STATUS_COLORS = {
  pending_payment: 'text-[#c9a26a] border-[#c9a26a]/40 bg-[#c9a26a]/10',
  processing_payment: 'text-[#c9a26a] border-[#c9a26a]/40 bg-[#c9a26a]/10',
  paid: 'text-[#7fd8a4] border-[#278758]/50 bg-[#278758]/15',
  failed: 'text-[#e07a6b] border-[#e07a6b]/40 bg-[#e07a6b]/10',
  canceled: 'text-[#93aa9c] border-white/15 bg-white/5',
};

function toman(n) {
  return `${Number(n || 0).toLocaleString('fa-IR')} تومان`;
}

function AdminLogin() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn({ phone: toEnglishDigits(phone.trim()), password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ورود ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070908] px-4 text-[#f3eada]" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111313] p-6 shadow-2xl">
        <h1 className="mb-1 text-lg font-bold">ورود مدیر</h1>
        <p className="mb-5 text-sm text-[#93aa9c]">برای دیدن سفارش‌ها با حساب ادمین وارد شوید.</p>
        <label className="mb-3 block text-sm">
          شماره موبایل
          <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-left outline-none focus:border-[#c9a26a]/60" placeholder="0912xxxxxxx" />
        </label>
        <label className="mb-4 block text-sm">
          رمز عبور
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-left outline-none focus:border-[#c9a26a]/60" />
        </label>
        {error && <p className="mb-3 text-sm text-[#e07a6b]">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#278758] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>
    </div>
  );
}

function OrderDetail({ orderId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchAdminOrder(orderId)
      .then((d) => { if (alive) setData(d); })
      .catch((err) => { if (alive) setError(err instanceof ApiError ? err.message : 'خطا در دریافت سفارش'); });
    return () => { alive = false; };
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111313] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">جزئیات سفارش</h2>
          <button onClick={onClose} className="text-sm text-[#93aa9c] hover:text-[#f3eada]">بستن ✕</button>
        </div>
        {error && <p className="text-sm text-[#e07a6b]">{error}</p>}
        {!data && !error && <p className="text-sm text-[#93aa9c]">در حال بارگذاری…</p>}
        {data && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-[#93aa9c]">مشتری: </span>{data.order.customer_name}</div>
              <div dir="ltr" className="text-left"><span className="text-[#93aa9c]">موبایل: </span>{data.order.customer_phone}</div>
              <div className="col-span-2"><span className="text-[#93aa9c]">آدرس: </span>{data.order.customer_address}</div>
              <div><span className="text-[#93aa9c]">وضعیت: </span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[data.order.status] || ''}`}>{STATUS_LABELS[data.order.status] || data.order.status}</span>
              </div>
              <div><span className="text-[#93aa9c]">مبلغ کل: </span>{toman(data.order.total_amount)}</div>
              {data.order.zarinpal_ref_id && <div><span className="text-[#93aa9c]">کد پیگیری زرین‌پال: </span><span dir="ltr">{data.order.zarinpal_ref_id}</span></div>}
              <div><span className="text-[#93aa9c]">ثبت‌شده در: </span>{data.order.created_at}</div>
              {data.order.paid_at && <div><span className="text-[#93aa9c]">پرداخت‌شده در: </span>{data.order.paid_at}</div>}
            </div>
            <div className="border-t border-white/10 pt-3">
              <p className="mb-2 font-semibold text-[#93aa9c]">اقلام سفارش</p>
              <ul className="space-y-2">
                {data.items.map((item, i) => (
                  <li key={i} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.name}</span>
                      <span>{item.qty} × {toman(item.unit_price)}</span>
                    </div>
                    <div className="mt-1 text-xs text-[#93aa9c]">{item.weight_label}{item.meta ? ` — ${item.meta}` : ''}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminOrders({ status: status || undefined, q: q || undefined, limit: LIMIT, offset });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطا در دریافت سفارش‌ها');
    } finally {
      setLoading(false);
    }
  }, [status, q, offset]);

  useEffect(() => { load(); }, [load]);

  const tabs = ['', 'paid', 'pending_payment', 'processing_payment', 'failed', 'canceled'];

  return (
    <div className="min-h-screen bg-[#070908] px-4 py-8 text-[#f3eada] sm:px-8" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">سفارش‌ها</h1>
            <p className="text-sm text-[#93aa9c]">خوش آمدی، {user.name}</p>
          </div>
          <button onClick={signOut} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:border-[#c9a26a]/60">خروج</button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t || 'all'}
              onClick={() => { setStatus(t); setOffset(0); }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${status === t ? 'border-[#c9a26a] bg-[#c9a26a]/15 text-[#f3eada]' : 'border-white/15 text-[#93aa9c] hover:border-white/30'}`}
            >
              {t ? STATUS_LABELS[t] : 'همه'}
              {result?.counts && t && ` (${result.counts[t]})`}
            </button>
          ))}
        </div>

        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOffset(0); }}
          placeholder="جستجو بر اساس نام یا شماره موبایل مشتری…"
          className="mb-4 w-full max-w-sm rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#c9a26a]/60"
        />

        {error && <p className="mb-3 text-sm text-[#e07a6b]">{error}</p>}
        {loading && <p className="text-sm text-[#93aa9c]">در حال بارگذاری…</p>}

        {!loading && result && (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[#93aa9c]">
                    <th className="px-3 py-2 text-right font-medium">مشتری</th>
                    <th className="px-3 py-2 text-right font-medium">موبایل</th>
                    <th className="px-3 py-2 text-right font-medium">مبلغ</th>
                    <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                    <th className="px-3 py-2 text-right font-medium">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.orders.map((o) => (
                    <tr key={o.id} onClick={() => setOpenOrderId(o.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2">{o.customer_name}</td>
                      <td className="px-3 py-2" dir="ltr">{o.customer_phone}</td>
                      <td className="px-3 py-2">{toman(o.total_amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[o.status] || ''}`}>{STATUS_LABELS[o.status] || o.status}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-[#93aa9c]">{o.created_at}</td>
                    </tr>
                  ))}
                  {result.orders.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-[#93aa9c]">سفارشی پیدا نشد</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-[#93aa9c]">
              <span>{result.total} سفارش</span>
              <div className="flex gap-2">
                <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="rounded-lg border border-white/15 px-3 py-1.5 disabled:opacity-40">قبلی</button>
                <button disabled={offset + LIMIT >= result.total} onClick={() => setOffset(offset + LIMIT)} className="rounded-lg border border-white/15 px-3 py-1.5 disabled:opacity-40">بعدی</button>
              </div>
            </div>
          </>
        )}
      </div>

      {openOrderId && <OrderDetail orderId={openOrderId} onClose={() => setOpenOrderId(null)} />}
    </div>
  );
}

export default function AdminOrders() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#070908] text-[#f3eada]">در حال بارگذاری…</div>;
  }
  if (!user) return <AdminLogin />;
  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070908] px-4 text-center text-[#f3eada]" dir="rtl">
        <p>حساب شما دسترسی مدیریتی ندارد.</p>
      </div>
    );
  }
  return <Dashboard />;
}
