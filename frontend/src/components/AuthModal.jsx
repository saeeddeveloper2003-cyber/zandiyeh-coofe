import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, LogIn, UserPlus, X } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const toEnglishDigits = (value) => value
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function AuthModal({ open, onClose }) {
  const { signIn, signUp } = useAuth();
  const closeRef = useRef(null);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const phone = toEnglishDigits(form.phone.trim());
    const name = form.name.trim();
    if (!/^09\d{9}$/.test(phone)) {
      setError('شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود');
      return;
    }
    if (form.password.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }
    if (mode === 'register' && !name) {
      setError('نام و نام خانوادگی را وارد کنید');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') await signUp({ name, phone, password: form.password });
      else await signIn({ phone, password: form.password });
      onClose();
      setForm({ name: '', phone, password: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    if (submitting) return;
    setError('');
    setMode((current) => current === 'login' ? 'register' : 'login');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111313] p-7 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[#c9a26a]">حساب کاربری</p>
            <h2 id="auth-title" className="mt-2 text-2xl font-extrabold">{mode === 'login' ? 'ورود به زندیه' : 'ساخت حساب کاربری'}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={submitting} aria-label="بستن" className="rounded-xl p-2 text-[#93aa9c] hover:bg-white/5 disabled:opacity-40"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === 'register' && (
            <label className="block text-sm font-semibold">
              نام و نام خانوادگی
              <input autoComplete="name" value={form.name} disabled={submitting} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#c9a26a] disabled:opacity-50" />
            </label>
          )}
          <label className="block text-sm font-semibold">
            شماره موبایل
            <input autoComplete="tel" inputMode="numeric" value={form.phone} disabled={submitting} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="۰۹۱۲۱۲۳۴۵۶۷" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#c9a26a] disabled:opacity-50" />
          </label>
          <label className="block text-sm font-semibold">
            رمز عبور
            <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" value={form.password} disabled={submitting} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="حداقل ۸ کاراکتر" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#c9a26a] disabled:opacity-50" />
          </label>

          {error && <div className="flex items-start gap-2 rounded-2xl border border-[#ef8f7b]/25 bg-[#ef8f7b]/5 p-4 text-xs leading-6"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#ef8f7b]" /><span>{error}</span></div>}

          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c9a26a] py-3 font-bold text-[#0a0a0b] hover:bg-[#e3c081] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? <Loader2 size={17} className="animate-spin" /> : mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}
            {submitting ? 'در حال پردازش...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
          </button>
        </form>

        <button type="button" onClick={switchMode} disabled={submitting} className="mt-5 w-full text-center text-sm text-[#93aa9c] hover:text-[#e3c081] disabled:opacity-50">
          {mode === 'login' ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
        </button>
      </div>
    </div>
  );
}
