import React from "react";
import { useEffect, useState } from 'react';
import { Plus, Minus, Coffee } from 'lucide-react';
import { formatToman, priceForGrams, formatGrams } from '../data/products';

const presets = [250, 500, 1000, 2000, 5000, 10000];

const MAX_GRAMS = 20000; // must match the backend's productLineSchema max

const sanitizeGrams = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 250;
  const rounded = Math.max(250, Math.round(parsed / 250) * 250);
  return Math.min(rounded, MAX_GRAMS);
};

export default function ProductCard({ product, grams, onGramsChange, onAdd }) {
  // Keep the interactive value local so the UI responds immediately.
  // A ref mirrors the latest value synchronously, which is important for
  // rapid repeated + / - clicks because React state updates are asynchronous.
  const [localGrams, setLocalGrams] = useState(() => sanitizeGrams(grams));
  const gramsRef = React.useRef(localGrams);

  const [text, setText] = useState(String(localGrams));
  const price = priceForGrams(product.price, localGrams);

  const applyGrams = (next) => {
    const sanitized = sanitizeGrams(next);
    gramsRef.current = sanitized;
    setLocalGrams(sanitized);
    setText(String(sanitized));
    onGramsChange(sanitized);
  };

  const adjust = (delta) => {
    const current = gramsRef.current;
    const next = Math.min(
      MAX_GRAMS,
      Math.max(250, Math.round((current + delta) / 250) * 250)
    );
    applyGrams(next);
  };

  const commit = () => {
    applyGrams(text);
  };

  const commitAndAdd = () => {
    const sanitized = sanitizeGrams(text);
    applyGrams(sanitized);
    onAdd(sanitized);
  };

  // Auto-commit manually typed values after the user stops typing.
  useEffect(() => {
    const timer = window.setTimeout(commit, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <article className=" cursor-pointer  group overflow-hidden rounded-3xl border border-white/8 bg-white/[.035] transition duration-300 hover:-translate-y-1 hover:border-[#c9a26a]/30 hover:bg-white/[.05]">
      <div className="relative h-56 overflow-hidden bg-[#152e27]">
        <img
          src={product.image}
          alt={`عکس واقعی قهوه ${product.name}`}
          className="h-full w-full object-cover opacity-95 transition duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/coffee-colombia.webp";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1815] via-transparent to-transparent" />
        <div className="absolute right-5 top-4 rounded-full border border-[#c9a26a]/25 bg-[#0a0a0b]/60 px-3 py-1 text-[11px] font-semibold text-[#e3c081]">
          تفت {product.roast}
        </div>
        {product.inStock === false && (
          <div className="absolute left-5 top-4 rounded-full border border-[#ef8f7b]/40 bg-[#0a0a0b]/70 px-3 py-1 text-[11px] font-semibold text-[#ef8f7b]">
            ناموجود
          </div>
        )}
        <div className="absolute bottom-4 right-5 flex items-center gap-2 rounded-full bg-[#0a0a0b]/65 px-3 py-1 text-xs text-[#f3eada]">
          <Coffee size={14} />
          {product.origin}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[#93aa9c]">{product.origin}</p>
            <h3 className="mt-1 text-lg font-bold">{product.name}</h3>
          </div>
          <span className="rounded-lg border border-white/8 px-2 py-1 text-[10px] text-[#93aa9c]">{product.tag}</span>
        </div>

        <p className="mt-3 min-h-12 text-sm leading-7 text-[#93aa9c]">{product.desc}</p>

        <div className="mt-5 flex flex-wrap gap-2 rounded-2xl bg-black/20 p-2">
          {presets.map((g) => (
            <button
              key={g}
              onClick={() => applyGrams(g)}
              className={`rounded-xl px-3 py-2 text-xs transition ${
                localGrams === g ? 'bg-[#c9a26a] font-bold text-[#0a0a0b]' : 'text-[#93aa9c] hover:bg-white/5'
              }`}
            >
              {formatGrams(g)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => adjust(-250)} disabled={localGrams <= 250} aria-label="کاهش مقدار" className="rounded-xl border border-white/10 p-2 text-[#93aa9c] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30">
            <Minus size={15} />
          </button>
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <input
              type="text"
              value={localGrams}
              readOnly
              aria-label="مقدار قهوه"
              className="w-full cursor-default bg-transparent text-center text-sm outline-none select-none"
            />
            <span className="text-xs text-[#93aa9c]">گرم</span>
          </label>
          <button onClick={() => adjust(250)} disabled={localGrams >= MAX_GRAMS} aria-label="افزایش مقدار" className="rounded-xl border border-white/10 p-2 text-[#93aa9c] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30">
            <Plus size={15} />
          </button>
        </div>

        <p className="mt-2 text-[11px] text-[#93aa9c]">مناسب مصرف خانگی و سفارش‌های کافه؛ تا سقف ۲۰ کیلوگرم در هر قلم</p>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[#93aa9c]">قیمت {formatGrams(localGrams)}</p>
            <strong className="text-lg text-[#e3c081]">{formatToman(price)}</strong>
          </div>
          <button
            onClick={commitAndAdd}
            disabled={product.inStock === false}
            className="flex items-center gap-2 rounded-full bg-[#f3eada] px-4 py-2 text-sm font-bold text-[#0a0a0b] transition hover:bg-[#e3c081] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus size={16} />
            {product.inStock === false ? 'ناموجود' : 'افزودن'}
          </button>
        </div>
      </div>
    </article>
  );
}
