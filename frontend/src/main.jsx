import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import CheckoutResult from './pages/CheckoutResult';
import AdminOrders from './pages/AdminOrders';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// A couple of extra routes (the Zarinpal payment-return page, the admin
// orders page) don't need a full router dependency — just check the path
// once at boot.
const isCheckoutResult = window.location.pathname.startsWith('/checkout/result');
const isAdmin = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isCheckoutResult ? (
        <CheckoutResult />
      ) : isAdmin ? (
        <AuthProvider>
          <AdminOrders />
        </AuthProvider>
      ) : (
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);
