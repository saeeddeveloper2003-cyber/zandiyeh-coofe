import React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useLocalStorage('zandieh-cart-v1', {}, (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).every((item) => (
      item &&
      typeof item === 'object' &&
      typeof item.name === 'string' &&
      typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice) &&
      typeof item.qty === 'number' && Number.isFinite(item.qty) && item.qty > 0
    ));
  });
  const [toast, setToast] = useState('');

  const add = useCallback((item) => {
    setCart((current) => ({
      ...current,
      [item.key]: current[item.key]
        ? { ...current[item.key], qty: current[item.key].qty + 1 }
        : { ...item, qty: 1 },
    }));
    setToast(`${item.name} به سبد اضافه شد`);
    window.clearTimeout(add.toastTimer);
    add.toastTimer = window.setTimeout(() => setToast(''), 2200);
  }, [setCart]);

  const changeQty = useCallback((key, delta) => {
    setCart((current) => {
      const item = current[key];
      if (!item) return current;
      const qty = item.qty + delta;
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
