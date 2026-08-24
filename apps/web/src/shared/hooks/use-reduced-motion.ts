'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Começa em `false` porque o servidor não sabe a preferência: o primeiro paint
 * é igual para todo mundo e o efeito corrige antes de qualquer animação valer a
 * pena. Assumir `true` faria a página nunca animar em navegador sem match.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(QUERY);

    setReduced(media.matches);

    function onChange(event: MediaQueryListEvent): void {
      setReduced(event.matches);
    }

    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
