'use client';

import type { PointerEvent, PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/core/cn';
import { useReducedMotion } from '@/core/use-reduced-motion';

/** Amplitude máxima, em graus. Acima disso o cartão vira brinquedo. */
const MAX_DEGREES = 5;

/**
 * Inclina o conteúdo na direção do ponteiro.
 *
 * Só responde a `mouse`: no toque, arrastar sobre o cartão é o gesto de rolar a
 * página, e inclinar durante a rolagem é exatamente o efeito que enjoa. Quem
 * pediu menos movimento no sistema não recebe inclinação nenhuma, e sem
 * JavaScript o cartão simplesmente fica reto — nada é escondido esperando o
 * ponteiro chegar.
 */
export function Tilt({ children, className }: PropsWithChildren<{ className?: string }>) {
  const reducedMotion = useReducedMotion();
  const frame = useRef<number>(undefined);
  const [transform, setTransform] = useState<string>();

  useEffect(() => {
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, []);

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (reducedMotion || event.pointerType !== 'mouse') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    /*
      Um quadro por movimento: o ponteiro dispara dezenas de eventos por
      segundo e cada `setState` custa um render. Sem isto a inclinação fica
      presa atrás da própria fila de renderização.
    */
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);

    frame.current = requestAnimationFrame(() => {
      setTransform(
        `perspective(1200px) rotateX(${(-y * MAX_DEGREES).toFixed(2)}deg) rotateY(${(x * MAX_DEGREES).toFixed(2)}deg)`,
      );
    });
  }

  function onPointerLeave(): void {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    setTransform(undefined);
  }

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ transform }}
      className={cn(
        'transition-transform duration-300 ease-out-quint [transform-style:preserve-3d]',
        className,
      )}
    >
      {children}
    </div>
  );
}
