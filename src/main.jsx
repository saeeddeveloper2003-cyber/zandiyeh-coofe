import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CartProvider>
        <App />
      </CartProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
