import React from "react";
import { useMemo, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { computeMixPrice, computeMixProfile, findProduct, formatToman, signatureBlend, weights } from '../data/products';
import TasteBars from './TasteBars';

function normalizePcts(ids, current, changedId, value) {
  const next = { ...current, [changedId]: Math.max(0, Math.min(100, Math.round(value))) };
  const others = ids.filter((id) => id !== changedId);
  if (!others.length) {
    next[changedId] = 100;
    return next;
  }
  const remaining = 100 - next[changedId];
  const total = others.reduce((s, id) => s + (current[id] ?? 0), 0);
  let used = 0;
  others.forEach((id, i) => {
    const v = i === others.length - 1
      ? remaining - used
      : total
        ? Math.round((current[id] ?? 0) / total * remaining)
        : Math.floor(remaining / others.length);
    next[id] = Math.max(0, v);
    used += next[id];
  });
  return next;
}

export default function BlendBuilder({ products, loading, onAdd }) {
  const [picked, setPicked] = useState([]);
  const [pct, setPct] = useState({});
  const [weightIdx, setWeightIdx] = useState(0);
  const [name, setName] = useState('');

  const mix = useMemo(() => picked.map((id) => ({ productId: id, pct: pct[id] ?? 0 })), [picked, pct]);
  const profile = useMemo(() => computeMixProfile(mix, products), [mix, products]);
  const price = useMemo(() => computeMixPrice(mix, products, weightIdx), [mix, products, weightIdx]);

  const toggle = (id) => {
    if (picked.includes(id)) {
      const n = picked.filter((x) => x !== id);
      const next = { ...pct };
      delete next[id];
      if (n.length === 1) next[n[0]] = 100;
      if (n.length === 2) {
        const total = n.reduce((s, k) => s + (pct[k] ?? 0), 0);
        next[n[0]] = total ? Math.round((pct[n[0]] ?? 0) / total * 100) : 50;
        next[n[1]] = 100 - next[n[0]];
      }
      setPicked(n);
      setPct(next);
      return;
    }
    if (picked.length >= 3) return;
    const n = [...picked, id];
    const next = { ...pct, [id]: 0 };
    if (n.length === 1) next[id] = 100;
    else if (n.length === 2) { next[n[0]] = 60; next[id] = 40; }
    else { next[n[0]] = 50; next[n[1]] = 30; next[id] = 20; }
    setPicked(n);
    setPct(next);
  };

  const addCustom = () => {
    if (picked.length < 2) return;
    const blendName = name.trim() || 'میکس شخصی من';
    const composition = mix.map((m) => `${m.pct}٪ ${findProduct(m.productId, products).name}`).join(' + ');
    onAdd({
      // crypto.randomUUID() (not Date.now()) so two clicks within the same
      // millisecond can never collide and silently overwrite each other in
      // the cart.
      key: `custom_${crypto.randomUUID()}`,
      kind: 'blend',
      mix,
      weightIdx,
      name: blendName,
      weightLabel: weights[weightIdx].label,
      unitPrice: price,
      meta: composition,
    });
    setName('');
    setPicked([]);
    setPct({});
    setWeightIdx(0);
  };

  const signaturePrice = computeMixPrice(signatureBlend, products, 0);
  const signatureProfile = computeMixProfile(signatureBlend, products);

  return (
    <section id="blend" className="bg-[#0e332b] px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[4px] text-[#c9a26a]">میکس اختصاصی</div>
          <h2 className="mt-3 text-4xl font-extrabold">میکس امضای ما یا میکس خودتو بساز</h2>
          <p className="mt-4 text-[#93aa9c]">۲ تا ۳ دانه انتخاب کن و نسبت هرکدام را تنظیم کن تا طعم مخصوص خودت ساخته شود.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#e3c081]/15 bg-[#0a0a0b]/25 p-6 shadow-xl shadow-black/20 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-[#c9a26a]/25 bg-[#c9a26a]/10 px-3 py-1 text-xs font-semibold text-[#e3c081]">میکس زنده‌ی ما</span>
              <Sparkles size={18} className="text-[#e3c081]" />
            </div>
            <h3 className="mt-6 text-2xl font-extrabold">میکس امضای زندیه</h3>
            <p className="mt-3 text-sm leading-7 text-[#93aa9c]">
              ترکیبی متعادل از اتیوپی و برزیل؛ شروعی گلی و میوه‌ای که به بدنه‌ای شکلاتی و نرم ختم می‌شه.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs">۶۰٪ اتیوپی یرگاچف</span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs">۴۰٪ برزیل سانتوس</span>
            </div>
            <div className="mt-7">
              <TasteBars profile={signatureProfile} />
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-6">
              <div>
                <p className="text-xs text-[#93aa9c]">۲۵۰ گرم</p>
                <strong className="text-xl text-[#e3c081]">{formatToman(signaturePrice)}</strong>
              </div>
              <button
                onClick={() => onAdd({
                  key: 'signature_blend',
                  kind: 'blend',
                  mix: signatureBlend,
                  weightIdx: 0,
                  name: 'میکس امضای زندیه',
                  weightLabel: '۲۵۰ گرم',
                  unitPrice: signaturePrice,
                  meta: '۶۰٪ اتیوپی یرگاچف + ۴۰٪ برزیل سانتوس',
                })}
                className="rounded-full bg-[#c9a26a] px-5 py-2.5 text-sm font-bold text-[#0a0a0b] hover:bg-[#e3c081]"
              >
                افزودن به سبد
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#e3c081]/15 bg-[#10241f]/70 p-6 shadow-xl shadow-black/20 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#93aa9c]">بلندساز شخصی</span>
                <h3 className="mt-5 text-2xl font-extrabold">میکس خودتو بساز</h3>
              </div>
              <span className="text-xs text-[#93aa9c]">{picked.length}/۳ دانه</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {loading && (
                <span className="text-xs text-[#93aa9c]">در حال بارگذاری دانه‌ها...</span>
              )}
              {!loading && products.map((p) => {
                const active = picked.includes(p.id);
                return (
                  <button
                    disabled={(!active && picked.length >= 3) || p.inStock === false}
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                      active
                        ? 'border-[#c9a26a] bg-[#c9a26a]/10 text-[#e3c081]'
                        : 'border-white/10 text-[#93aa9c] hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-35'
                    }`}
                  >
                    {active && <Check size={13} />} {p.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 space-y-5">
              {picked.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-[#93aa9c]">
                  اول ۲ یا ۳ دانه از بالا انتخاب کن.
                </div>
              ) : (
                picked.map((id) => (
                  <div key={id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>{findProduct(id, products).name}</span>
                      <b className="text-[#e3c081]">{pct[id] ?? 0}٪</b>
                    </div>
                    <input
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#c9a26a]"
                      type="range"
                      min="0"
                      max="100"
                      value={pct[id] ?? 0}
                      onChange={(e) => setPct(normalizePcts(picked, pct, id, e.target.value))}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="mt-7">
              <TasteBars profile={profile} />
            </div>

            <label className="mt-7 block text-sm font-semibold">
              اسم میکس شما
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                // Must match backend blendLineSchema's name max(60) in
                // backend/src/routes/orders.js — otherwise a name typed here
                // gets silently rejected at checkout with only a generic
                // "ورودی نامعتبر است" error.
                maxLength={60}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-[#c9a26a]"
                placeholder="مثلاً میکس صبح من"
              />
            </label>

            <div className="mt-5 flex gap-2">
              {weights.map((w, i) => (
                <button
                  key={w.label}
                  onClick={() => setWeightIdx(i)}
                  className={`flex-1 rounded-xl border py-2 text-xs ${
                    weightIdx === i ? 'border-[#c9a26a] bg-[#c9a26a]/10 text-[#e3c081]' : 'border-white/10 text-[#93aa9c]'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-between border-t border-white/8 pt-6">
              <div>
                <p className="text-xs text-[#93aa9c]">قیمت میکس</p>
                <strong className="text-lg text-[#e3c081]">{formatToman(price)}</strong>
              </div>
              <button
                disabled={picked.length < 2}
                onClick={addCustom}
                className="rounded-full bg-[#f3eada] px-5 py-2.5 text-sm font-bold text-[#0a0a0b] disabled:cursor-not-allowed disabled:opacity-30"
              >
                افزودن میکس به سبد
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
