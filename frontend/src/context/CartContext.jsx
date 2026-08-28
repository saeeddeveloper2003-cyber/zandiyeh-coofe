import React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CartContext = createContext(null);

// Must match productLineSchema/blendLineSchema's qty max in backend/src/routes/orders.js —
// otherwise a cart quantity the UI allows could get rejected wholesale at
// checkout with only a generic "ورودی نامعتبر است" error and no indication
// which line (or why) failed.
const MAX_LINE_QTY = 50;

export function CartProvider({ children }) {
  const [cart, setCart] = useLocalStorage('zandieh-cart-v1', {}, (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).every((item) => {
      if (!item || typeof item !== 'object') return false;
      if (typeof item.name !== 'string' || !item.name.trim()) return false;
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) return false;
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_LINE_QTY) return false;
      if (item.kind === 'product') return typeof item.productId === 'string' && Number.isInteger(item.grams) && item.grams >= 250;
      if (item.kind === 'blend') return Array.isArray(item.mix) && Number.isInteger(item.weightIdx);
      return false;
    });
  });
  const [toast, setToast] = useState('');
  // Tracks the pending "toast" auto-dismiss timer. A ref (not a property
  // stashed on the `add` callback itself) so it survives across renders
  // without mutating a function after it's been created.
  const toastTimerRef = useRef(null);

  const add = useCallback((item) => {
    const existingQty = cart[item.key]?.qty ?? 0;
    if (existingQty >= MAX_LINE_QTY) {
      setToast(`حداکثر تعداد مجاز برای ${item.name} ۵۰ عدد است`);
    } else {
      setCart((current) => ({
        ...current,
        [item.key]: current[item.key]
          ? { ...current[item.key], qty: existingQty + 1 }
          : { ...item, qty: 1 },
      }));
      setToast(`${item.name} به سبد اضافه شد`);
    }
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2200);
  }, [cart, setCart]);

  const changeQty = useCallback((key, delta) => {
    setCart((current) => {
      const item = current[key];
      if (!item) return current;
      const qty = Math.min(MAX_LINE_QTY, item.qty + delta);
      if (qty <= 0) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: { ...item, qty } };
    });
  }, [setCart]);

  const remove = useCallback((key) => {
    setCart((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, [setCart]);

  const clear = useCallback(() => setCart({}), [setCart]);

  const items = useMemo(() => Object.entries(cart), [cart]);
  const count = useMemo(() => items.reduce((sum, [, item]) => sum + Math.max(0, Math.floor(Number(item.qty) || 0)), 0), [items]);
  const total = useMemo(() => items.reduce((sum, [, item]) => sum + Math.max(0, Math.floor(Number(item.qty) || 0)) * Math.max(0, Number(item.unitPrice) || 0), 0), [items]);

  const value = useMemo(() => ({ cart, items, count, total, toast, add, changeQty, remove, clear }), [cart, items, count, total, toast, add, changeQty, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
