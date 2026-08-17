import React from "react";
import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Story from './components/Story';
import ServicesBar from './components/ServicesBar';
import Products from './components/Products';
import BlendBuilder from './components/BlendBuilder';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import { useCart } from './context/CartContext';

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { items, count, total, toast, add, changeQty, remove, clear } = useCart();

  const checkout = () => {
    if (!items.length) return;
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <div
  className="
    grain
    relative
    min-h-screen
    overflow-hidden
    bg-[#070908]
    text-[#f3eada]
    before:pointer-events-none
    before:absolute
    before:inset-0
    before:bg-[radial-gradient(circle_at_85%_8%,rgba(39,120,88,0.24),transparent_28%),radial-gradient(circle_at_8%_88%,rgba(201,162,106,0.12),transparent_24%)]
    before:content-['']
  "
>
          <Header count={count} onCart={() => setCartOpen(true)} />
      <main>
        <Hero />
        <Story />
        <ServicesBar />
        <Products onAdd={add} />
        <BlendBuilder onAdd={add} />
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={items} onChangeQty={changeQty} onRemove={remove} total={total} onCheckout={checkout} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} total={total} onSuccess={clear} />
      <div role="status" aria-live="polite" className={`fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full border border-[#c9a26a]/25 bg-[#121212]/95 px-5 py-3 text-sm shadow-2xl backdrop-blur-xl transition ${toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>
        {toast}
      </div>
    </div>
  );
}
