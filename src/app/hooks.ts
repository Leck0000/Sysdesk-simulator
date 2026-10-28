import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../app/store';

export function useAppState() {
  const { state, dispatch } = useStore();
  return { state, dispatch };
}

export function useDebounce(value: string, delay: number = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}