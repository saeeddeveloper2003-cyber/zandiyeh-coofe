import React from 'react';
import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import { products, priceForGrams, formatGrams } from '../data/products';
import { SlidersHorizontal } from 'lucide-react';
export default function Products({onAdd}){
  const [filter,setFilter]=useState('همه');
  const [selectedGrams,setSelectedGrams]=useState({});
  const tags=['همه','روشن','متوسط','تیره'];
  const shown=useMemo(()=>filter==='همه'?products:products.filter(p=>p.tag===filter),[filter]);
  return <section id="products" className="px-5 py-24 lg:px-8"><div className="mx-auto max-w-7xl">
    <div className="mx-auto mb-12 max-w-2xl text-center"><div className="text-xs font-semibold uppercase tracking-[4px] text-[#c9a26a]">فروشگاه</div><h2 className="mt-3 text-4xl font-extrabold">دانه‌های قهوه</h2><p className="mt-4 text-[#93aa9c]">برای مصرف خانگی یا کافه، مقدار دقیق موردنیازت را برحسب گرم انتخاب کن؛ حتی بیشتر از ۱ کیلوگرم.</p></div>
    <div className="mb-10 flex flex-wrap items-center justify-center gap-2"><div className="ml-2 text-[#93aa9c]"><SlidersHorizontal size={15}/></div>{tags.map(t=><button key={t} onClick={()=>setFilter(t)} className={`rounded-full border px-4 py-2 text-sm transition ${filter===t?'border-[#c9a26a] bg-[#c9a26a]/10 text-[#e3c081]':'border-white/10 text-[#93aa9c] hover:border-white/20 hover:text-[#f3eada]'}`}>{t}</button>)}</div>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{shown.map(product=>{const grams=selectedGrams[product.id]??250;return <ProductCard key={product.id} product={product} grams={grams} onGramsChange={g=>setSelectedGrams(s=>({...s,[product.id]:g}))} onAdd={()=>onAdd({key:`product_${product.id}_${grams}`,name:product.name,weightLabel:formatGrams(grams),unitPrice:priceForGrams(product.price,grams)})}/>})}</div>
  </div></section>
}
