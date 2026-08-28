import React from "react";
import { useEffect, useRef } from 'react';
import { Minus, Plus, Trash2, X, ShoppingBag } from 'lucide-react';
import { formatToman } from '../data/products';
export default function CartDrawer({open,onClose,items,onChangeQty,onRemove,total,onCheckout}){
 const closeButtonRef=useRef(null);
 const previouslyFocusedRef=useRef(null);
 const drawerRef=useRef(null);
 useEffect(()=>{
  if(!open)return;
  const previousOverflow=document.body.style.overflow;
  previouslyFocusedRef.current=document.activeElement;
  const onKeyDown=(event)=>{
   if(event.key==='Escape'){onClose();return;}
   if(event.key!=='Tab')return;
   const root=document.querySelector('[data-cart-dialog]');
   const focusable=root?Array.from(root.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')):[];
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.body.style.overflow='hidden';
  window.addEventListener('keydown',onKeyDown);
  requestAnimationFrame(()=>closeButtonRef.current?.focus());
  return()=>{
   document.body.style.overflow=previousOverflow;
   window.removeEventListener('keydown',onKeyDown);
   requestAnimationFrame(()=>{
    const target=previouslyFocusedRef.current;
    if(target instanceof HTMLElement && document.contains(target)) target.focus();
   });
  };
 },[open,onClose]);

 return <div className={`fixed inset-0 z-[80] ${open?'pointer-events-auto visible':'pointer-events-none invisible'}`} aria-hidden={!open}><div onClick={onClose} className={`absolute inset-0 bg-black/60 transition-opacity ${open?'opacity-100':'opacity-0'}`}/><aside ref={drawerRef} data-cart-dialog role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-hidden={!open} inert={!open} className={`absolute left-0 top-0 h-full w-full max-w-md border-r border-white/10 bg-[#101010] shadow-2xl transition-transform duration-300 ${open?'translate-x-0':'-translate-x-full'}`}><div className="flex h-full flex-col"><div className="flex items-center justify-between border-b border-white/8 px-6 py-5"><div><h3 id="cart-title" className="text-xl font-extrabold">سبد خرید</h3><p className="mt-1 text-xs text-[#93aa9c]">{items.length} نوع کالا</p></div><button ref={closeButtonRef} onClick={onClose} aria-label="بستن سبد خرید" className="rounded-xl p-2 hover:bg-white/5"><X size={20}/></button></div><div className="flex-1 overflow-y-auto p-5">{items.length===0?<div className="flex h-full flex-col items-center justify-center text-center text-[#93aa9c]"><ShoppingBag size={40} className="mb-4 opacity-40"/><p>سبد خرید شما خالی است</p><p className="mt-1 text-sm">یک قهوه‌ی خوب انتخاب کنید ☕</p></div>:<div className="space-y-3">{items.map(([key,item])=><div key={key} className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="flex gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#c9a26a]/10 text-[#e3c081]"><ShoppingBag size={20}/></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h4 className="font-bold">{item.name}</h4><button onClick={()=>onRemove(key)} aria-label={`حذف ${item.name}`} className="text-[#93aa9c] hover:text-[#ef8f7b]"><Trash2 size={15}/></button></div><p className="mt-1 text-xs text-[#93aa9c]">{item.weightLabel}</p>{item.meta&&<p className="mt-1 line-clamp-2 text-[11px] text-white/45">{item.meta}</p>}<div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-1"><button onClick={()=>onChangeQty(key,-1)} aria-label={`کم کردن ${item.name}`} className="rounded-full p-1 hover:bg-white/5"><Minus size={12}/></button><span className="min-w-5 text-center text-xs">{item.qty}</span><button onClick={()=>onChangeQty(key,1)} disabled={item.qty>=50} aria-label={`زیاد کردن ${item.name}`} className="rounded-full p-1 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"><Plus size={12}/></button></div><strong className="text-sm text-[#e3c081]">{formatToman(item.unitPrice*item.qty)}</strong></div></div></div></div>)}</div>}</div><div className="border-t border-white/8 p-5"><div className="mb-4 flex items-center justify-between"><span className="text-sm text-[#93aa9c]">جمع کل</span><strong className="text-xl text-[#e3c081]">{formatToman(total)}</strong></div><button disabled={!items.length} onClick={onCheckout} className="w-full rounded-2xl bg-[#c9a26a] py-3 font-bold text-[#0a0a0b] transition hover:bg-[#e3c081] disabled:cursor-not-allowed disabled:opacity-30">ادامه فرآیند خرید</button></div></div></aside></div>
}
