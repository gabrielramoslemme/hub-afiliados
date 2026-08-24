'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-sm font-medium text-ink-700 peer-disabled:opacity-60',
        'data-[invalid=true]:text-destructive',
        className,
      )}
      {...props}
    />
  );
}
