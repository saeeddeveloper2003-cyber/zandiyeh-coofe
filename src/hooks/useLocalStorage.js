import { useEffect, useState } from 'react';

export function useLocalStorage(key, initialValue, validate = () => true) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed = JSON.parse(raw);
      return validate(parsed) ? parsed : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }
  }, [key, value]);

  return [value, setValue];
}
