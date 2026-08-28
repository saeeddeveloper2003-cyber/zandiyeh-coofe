import React from "react";
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <section className="max-w-lg rounded-3xl border border-white/10 bg-white/[.03] p-8">
          <p className="text-sm text-[#93aa9c]">متأسفانه بخشی از صفحه با خطا مواجه شد.</p>
          <h1 className="mt-2 text-2xl font-extrabold">لطفاً صفحه را دوباره بارگذاری کنید.</h1>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-full bg-[#c9a26a] px-6 py-3 font-bold text-[#0a0a0b]">
            بارگذاری دوباره
          </button>
        </section>
      </main>
    );
  }
}
