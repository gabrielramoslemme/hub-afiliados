'use client';

import { Check, Copy, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { copyText, couponShareMessage, type ShareOutcome, shareOrCopy } from '../lib/coupon-share';

type Feedback = 'code-copied' | 'message-copied' | 'failed' | null;

const MESSAGES: Record<Exclude<Feedback, null>, string> = {
  'code-copied': 'Código copiado.',
  'message-copied': 'Mensagem copiada. É só colar onde quiser.',
  failed: 'Não foi possível copiar. Selecione o código acima.',
};

interface CouponActionsProps {
  code: string;
  discountPercent: number | null;
}

export function CouponActions({ code, discountPercent }: CouponActionsProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function show(next: Feedback): void {
    clearTimeout(timer.current);
    setFeedback(next);
    timer.current = setTimeout(() => setFeedback(null), 2800);
  }

  async function onCopy(): Promise<void> {
    show((await copyText(code, navigator)) === 'copied' ? 'code-copied' : 'failed');
  }

  async function onShare(): Promise<void> {
    const outcome: ShareOutcome = await shareOrCopy(
      couponShareMessage(code, discountPercent),
      navigator,
    );

    if (outcome === 'copied') show('message-copied');
    if (outcome === 'failed') show('failed');
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button type="button" onClick={onCopy}>
          {feedback === 'code-copied' ? <Check aria-hidden /> : <Copy aria-hidden />}
          Copiar código
        </Button>
        <Button type="button" variant="outline" onClick={onShare}>
          <Share2 aria-hidden />
          Compartilhar
        </Button>
      </div>

      {/* A confirmação precisa chegar a quem não vê o ícone trocar. */}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'mt-2 min-h-5 text-[0.8125rem] transition-opacity duration-200',
          feedback === null && 'opacity-0',
          feedback === 'failed' ? 'text-destructive' : 'text-[var(--status-approved)]',
        )}
      >
        {feedback ? MESSAGES[feedback] : ''}
      </p>
    </div>
  );
}
