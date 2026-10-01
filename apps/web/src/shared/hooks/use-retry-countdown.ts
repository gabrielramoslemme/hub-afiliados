'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * A espera que a API impôs, contada na tela. Enquanto `remaining` é maior que
 * zero o formulário trava o envio: mandar de novo antes disso só renovaria o
 * bloqueio, e a pessoa não saberia por quê.
 */
export function useRetryCountdown(): { remaining: number; start(seconds: number): void } {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (endsAt === null) return;

    function tick(): void {
      const left = Math.max(0, Math.ceil(((endsAt as number) - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setEndsAt(null);
    }

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [endsAt]);

  const start = useCallback((seconds: number) => setEndsAt(Date.now() + seconds * 1000), []);

  return { remaining, start };
}
