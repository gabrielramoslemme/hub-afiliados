'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/core/cn';
import { formatBRL } from '@/core/format';
import { useReducedMotion } from '@/core/use-reduced-motion';

interface CountUpProps {
  /** Valor final, em centavos. */
  cents: number;
  /** Duração total da contagem, em milissegundos. */
  duration?: number;
  className?: string;
}

/** Passo fixo de ~60fps. */
const FRAME = 16;

/** A mesma desaceleração de `--ease-out-quint`, agora como número. */
function easeOutQuint(progress: number): number {
  return 1 - (1 - progress) ** 5;
}

/**
 * Conta de zero até o valor quando ele entra na viewport, uma vez só.
 *
 * Três garantias, as mesmas do `Typewriter`: o valor final está sempre no
 * acessível, então leitor de tela anuncia o número inteiro de imediato em vez de
 * ler cada quadro da contagem; sem `IntersectionObserver` o número aparece
 * pronto, e não preso em zero; e quem pediu menos movimento no sistema também
 * recebe o número pronto.
 */
export function CountUp({ cents, duration = 1200, className }: CountUpProps) {
  const reducedMotion = useReducedMotion();
  const anchor = useRef<HTMLSpanElement>(null);
  const [running, setRunning] = useState(false);
  const [painted, setPainted] = useState(0);

  useEffect(() => {
    if (running) return;

    // Sem observer, ou com menos movimento pedido, o número já nasce no final.
    if (typeof IntersectionObserver === 'undefined' || reducedMotion) {
      setPainted(cents);
      return;
    }

    const element = anchor.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRunning(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [running, reducedMotion, cents]);

  useEffect(() => {
    if (!running) return;

    /*
      O tempo decorrido vive fora do estado e o intervalo é de passo fixo: assim
      o quadro seguinte não espera o React ter renderizado o anterior, e a
      contagem termina exatamente no valor — nunca um centavo antes.
    */
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += FRAME;
      const progress = Math.min(elapsed / duration, 1);

      setPainted(Math.round(cents * easeOutQuint(progress)));

      if (progress >= 1) clearInterval(timer);
    }, FRAME);

    return () => clearInterval(timer);
  }, [running, cents, duration]);

  return (
    <span ref={anchor} className={cn('inline-block', className)} data-tabular>
      <span className="sr-only">{formatBRL(cents)}</span>
      <span aria-hidden>{formatBRL(painted)}</span>
    </span>
  );
}
