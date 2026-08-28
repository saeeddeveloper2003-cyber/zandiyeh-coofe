import React from 'react';
import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import { priceForGrams, formatGrams } from '../data/products';
import { SlidersHorizontal, AlertTriangle, Loader2 } from 'lucide-react';

export default function Products({ products, loading, error, onAdd }) {
  const [filter, setFilter] = useState('همه');
  const [selectedGrams, setSelectedGrams] = useState({});
  const tags = ['همه', 'روشن', 'متوسط', 'تیره'];
  const shown = useMemo(
    () => (filter === 'همه' ? products : products.filter((p) => p.tag === filter)),
    [filter, products]
  );

  return (
    <section id="products" className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[4px] text-[#c9a26a]">فروشگاه</div>
          <h2 className="mt-3 text-4xl font-extrabold">دانه‌های قهوه</h2>
          <p className="mt-4 text-[#93aa9c]">
            برای مصرف خانگی یا کافه، مقدار دقیق موردنیازت را برحسب گرم انتخاب کن؛ حتی بیشتر از ۱ کیلوگرم.
          </p>
        </div>

        {!loading && !error && (
          <div className="mb-10 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <div className="text-[#93aa9c] sm:ml-2">
              <SlidersHorizontal size={15} />
            </div>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`w-40 rounded-full border px-4 py-2 text-center text-sm transition sm:w-auto sm:min-w-[104px] ${
                  filter === t
                    ? 'border-[#c9a26a] bg-[#c9a26a]/10 text-[#e3c081]'
                    : 'border-white/10 text-[#93aa9c] hover:border-white/20 hover:text-[#f3eada]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[420px] animate-pulse rounded-3xl border border-white/8 bg-white/[.03]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-[#ef8f7b]/20 bg-[#ef8f7b]/5 p-8 text-center">
            <AlertTriangle className="text-[#ef8f7b]" size={28} />
            <p className="text-sm text-[#f3eada]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-[#93aa9c] hover:border-white/30"
            >
              <Loader2 size={13} /> تلاش دوباره
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((product) => {
              const grams = selectedGrams[product.id] ?? 250;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  grams={grams}
                  onGramsChange={(g) => setSelectedGrams((s) => ({ ...s, [product.id]: g }))}
                  onAdd={(g) =>
                    onAdd({
                      key: `product_${product.id}_${g}`,
                      kind: 'product',
                      productId: product.id,
                      grams: g,
                      name: product.name,
                      weightLabel: formatGrams(g),
                      unitPrice: priceForGrams(product.price, g),
                    })
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
