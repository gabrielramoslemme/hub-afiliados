'use client';

import { Eye, MoreVertical, Pencil, Square } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import type { Campaign } from '../mock-data';
import { CampaignDetailDialog } from './campaign-detail-dialog';

/**
 * Conferir sem sair da listagem. Editar e encerrar dependem de rotas que a Onda
 * 1 não tem: aparecem desabilitados em vez de sumirem, que é o que mostra o
 * roteiro sem prometer um clique que não acontece.
 *
 * Encerrar só faria sentido no que está no ar — no resto some, porque item
 * desabilitado que nunca vai valer para aquela linha é ruído.
 */
export function RowActions({ campaign }: { campaign: Campaign }) {
  const [detailing, setDetailing] = useState(false);

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
            <span className="sr-only">Ações da campanha {campaign.name}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {/*
            O diálogo não pode nascer dentro do menu: o Radix desmonta o conteúdo
            ao fechar, e levaria o detalhe junto. O item só liga o estado.
          */}
          <DropdownMenuItem onSelect={() => setDetailing(true)}>
            <Eye aria-hidden />
            Detalhar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled>
            <Pencil aria-hidden />
            Editar — em breve
          </DropdownMenuItem>

          {campaign.status === 'active' && (
            <DropdownMenuItem disabled>
              <Square aria-hidden />
              Encerrar — em breve
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CampaignDetailDialog campaign={campaign} open={detailing} onOpenChange={setDetailing} />
    </>
  );
}
