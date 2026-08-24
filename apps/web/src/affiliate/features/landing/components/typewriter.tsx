'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/shared/hooks/use-reduced-motion';
import { cn } from '@/shared/lib/cn';

interface TypewriterProps {
  text: string;
  /** Milissegundos por caractere. */
  speed?: number;
  className?: string;
  caretClassName?: string;
}

/**
 * Digita o texto quando ele entra na viewport, uma vez só.
 *
 * O texto completo fica sempre no acessível: leitor de tela anuncia o cupom
 * inteiro de imediato, sem soletrar caractere a caractere conforme a animação
 * roda. O que aparece na tela é decorativo e vai como `aria-hidden`.
 */
export function Typewriter({ text, speed = 85, className, caretClassName }: TypewriterProps) {
  const reducedMotion = useReducedMotion();
  const anchor = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (started) return;

    // Sem IntersectionObserver o texto aparece inteiro, e não some.
    if (typeof IntersectionObserver === 'undefined' || reducedMotion) {
      setStarted(true);
      return;
    }

    const element = anchor.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [started, reducedMotion]);

  useEffect(() => {
    if (!started) return;

    if (reducedMotion) {
      setTyped(text.length);
      return;
    }

    setTyped(0);

    /*
      Um intervalo com o contador fora do estado, e não um `setTimeout`
      reagendado a cada caractere: o passo seguinte não depende do React ter
      renderizado o anterior, então a cadência não escorrega quando a aba perde
      prioridade — e o intervalo se cancela sozinho no último caractere.
    */
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setTyped(count);

      if (count >= text.length) clearInterval(timer);
    }, speed);

    return () => clearInterval(timer);
  }, [started, text, speed, reducedMotion]);

  const done = typed >= text.length;

  return (
    <span ref={anchor} className={cn('inline-flex items-center', className)}>
      <span className="sr-only">{text}</span>

      <span aria-hidden>{text.slice(0, typed)}</span>

      <span
        aria-hidden
        className={cn(
          'ml-0.5 inline-block h-[1.05em] w-px shrink-0 bg-current align-middle',
          'transition-opacity duration-300',
          started && !done && 'animate-caret',
          done && 'opacity-0',
          caretClassName,
        )}
      />
    </span>
  );
}
