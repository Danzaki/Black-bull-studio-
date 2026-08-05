import { useEffect } from 'react';

export function useMount(effect: () => void) {
  useEffect(() => {
    effect();
  }, []);
}
