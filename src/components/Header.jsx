import React from "react";
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const links = [
  ['داستان ما', '#story'],
  ['محصولات', '#products'],
  ['میکس بساز', '#blend'],
  ['تماس', '#contact'],
];

export default function Header({ count, onCart }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = (href) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`header-smooth fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/8 bg-[#0a0a0b]/80 py-3 backdrop-blur-2xl'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="header-inner mx-auto flex max-w-[1720px] items-center justify-between gap-6 px-6 lg:px-12">
          <button
            type="button"
            onClick={() => go('#home')}
            className="header-logo group shrink-0 text-right"
            aria-label="بازگشت به صفحه اصلی"
          >
            <span className="header-logo-text block text-[1.7rem] font-extrabold tracking-tight text-[#f3eada] transition-colors duration-500 group-hover:text-[#e3c081] sm:text-[2rem]">
              زندیه
            </span>
          </button>

          <nav className="header-nav hidden items-center gap-7 lg:flex xl:gap-10" aria-label="ناوبری اصلی">
            {links.map(([label, href]) => (
              <button
                type="button"
                key={href}
                onClick={() => go(href)}
                className="header-nav-item relative text-sm font-medium text-[#f3eada]/75 transition-colors duration-300 after:absolute after:-bottom-2 after:right-0 after:h-px after:w-0 after:bg-[#e3c081] after:transition-all after:duration-500 hover:text-[#f3eada] hover:after:w-full"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="header-actions flex items-center gap-2">
            <button
              type="button"
              onClick={onCart}
              className="header-cart relative flex items-center justify-center gap-2 rounded-full border border-white/15 bg-black/10 px-4 py-2.5 text-sm font-semibold text-[#f3eada] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c9a26a]/70 hover:bg-[#c9a26a]/8 hover:shadow-[0_10px_30px_rgba(201,162,106,.10)]"
              aria-label={`سبد خرید، ${count} قلم`}
            >
              <span className="hidden sm:inline">سبد خرید</span>
              <ShoppingBag size={17} aria-hidden="true" />
              <span key={count} className="header-cart-count flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c9a26a] px-1 text-[11px] font-extrabold leading-none text-[#0a0a0b]">
                {count}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="header-menu rounded-xl p-2 text-[#f3eada] transition-transform duration-300 hover:scale-105 lg:hidden"
              aria-label={open ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              {open ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-navigation"
        aria-hidden={!open}
        className={`header-mobile-menu fixed inset-x-0 top-0 z-40 bg-[#0a0a0b]/96 px-7 pb-8 pt-28 backdrop-blur-2xl transition-transform duration-500 lg:hidden ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex flex-col gap-5">
          {links.map(([label, href]) => (
            <button
              type="button"
              key={href}
              onClick={() => go(href)}
              className="text-right text-lg font-bold text-[#f3eada]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}