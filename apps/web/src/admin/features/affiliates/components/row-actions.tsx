'use client';

import { Check, Eye, MoreVertical, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AffiliateStatusEnum } from '@porto/contracts';
import { QUEUE_PATH } from '@/admin/shared/routes';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { ApproveDialog, RejectDialog } from './decision-dialogs';

interface RowActionsProps {
  publicId: string;
  name: string;
  status: AffiliateStatusEnum;
}

/**
 * Decidir sem sair da fila: quem analisa dez cadastros parecidos não deveria
 * atravessar duas navegações por decisão. O detalhe continua sendo o lugar de
 * conferir CPF e chave PIX — e por isso "Detalhar" é o primeiro item.
 *
 * Aprovar e reprovar só aparecem em cadastro ainda em análise. A API recusa o
 * resto com 409; esconder o que ela recusaria evita oferecer um caminho que
 * termina em erro.
 */
export function RowActions({ publicId, name, status }: RowActionsProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const decidable = status === AffiliateStatusEnum.PENDING_APPROVAL;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-ink-400 hover:text-ink-700 data-[state=open]:bg-ink-100"
          >
            <MoreVertical aria-hidden />
            <span className="sr-only">Ações do cadastro de {name}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`${QUEUE_PATH}/${publicId}`}>
              <Eye aria-hidden />
              Detalhar
            </Link>
          </DropdownMenuItem>

          {decidable && (
            <>
              <DropdownMenuSeparator />

              {/*
                O diálogo não pode nascer dentro do menu: o Radix desmonta o
                conteúdo do menu ao fechar, e levaria a confirmação junto. O item
                só liga o estado; quem monta o diálogo é o irmão abaixo.
              */}
              <DropdownMenuItem tone="positive" onSelect={() => setApproving(true)}>
                <Check aria-hidden />
                Aprovar
              </DropdownMenuItem>

              <DropdownMenuItem tone="destructive" onSelect={() => setRejecting(true)}>
                <X aria-hidden />
                Reprovar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ApproveDialog publicId={publicId} name={name} open={approving} onOpenChange={setApproving} />
      <RejectDialog publicId={publicId} name={name} open={rejecting} onOpenChange={setRejecting} />
    </>
  );
}
