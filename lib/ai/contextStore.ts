'use client';
import { useEffect } from 'react';

// Tiny store so any page can hand data to the AI without needing the provider.
let value: string | null = null;
const subs = new Set<() => void>();

export const getAIContext = () => value;
export const subscribeAIContext = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
export function setAIContext(v: string | null) {
  value = v;
  subs.forEach((f) => f());
}

// Usage in a page: useAIPageContext(`Token: ${name}\nLiquidity: ${liq}\n...`)
export function useAIPageContext(text: string | null) {
  useEffect(() => {
    setAIContext(text ? text.slice(0, 3000) : null);
    return () => setAIContext(null);
  }, [text]);
}
