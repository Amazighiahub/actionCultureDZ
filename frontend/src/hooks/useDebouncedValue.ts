// hooks/useDebouncedValue.ts
import { useState, useEffect } from 'react';

/**
 * Hook pour retarder la mise à jour d'une valeur
 * Utile pour éviter trop d'appels API lors de la saisie
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}