import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce rapid value changes (e.g. search queries, filter inputs)
 * Improves rendering performance for large product and transaction lists.
 */
export function useDebounce<T>(value: T, delayMs: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
