'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { ApproveDialog, RejectDialog } from './decision-dialogs';

interface DecisionActionsProps {
  publicId: string;
  name: string;
}

/**
 * A decisão é irreversível pela interface — não existe desfazer. Por isso as
 * duas ações confirmam antes, e a reprovação exige o motivo que vai no e-mail
 * ao afiliado e na trilha de auditoria.
 */
export function DecisionActions({ publicId, name }: DecisionActionsProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button onClick={() => setApproving(true)}>
        <Check aria-hidden />
        Aprovar cadastro
      </Button>

      <Button variant="outline" onClick={() => setRejecting(true)}>
        <X aria-hidden />
        Reprovar
      </Button>

      <ApproveDialog publicId={publicId} name={name} open={approving} onOpenChange={setApproving} />
      <RejectDialog publicId={publicId} name={name} open={rejecting} onOpenChange={setRejecting} />
    </div>
  );
}
