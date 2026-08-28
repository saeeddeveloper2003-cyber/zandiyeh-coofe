import { useEffect, useState } from 'react';
import { fetchProducts } from '../lib/api';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => { if (!cancelled) setProducts(data.products); })
      .catch((err) => { if (!cancelled) setError(err.message || 'خطا در دریافت محصولات'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { products, loading, error };
}
