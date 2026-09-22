'use client';

import { Pencil } from 'lucide-react';
import { useState } from 'react';
import type { CouponSummary } from '@porto/contracts';
import { Button } from '@/shared/components/ui/button';
import { ChangeCouponDialog } from './coupon-dialog';

interface CouponActionsProps {
  publicId: string;
  coupon: CouponSummary;
}

export function CouponActions({ publicId, coupon }: CouponActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Pencil aria-hidden />
        Alterar cupom
      </Button>

      <ChangeCouponDialog publicId={publicId} coupon={coupon} open={open} onOpenChange={setOpen} />
    </>
  );
}
