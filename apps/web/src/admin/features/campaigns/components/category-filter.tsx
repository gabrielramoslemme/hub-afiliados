'use client';

import { Check, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { type CampaignParams, campaignsHref } from '../campaign-params';
import { CAMPAIGN_CATEGORIES } from '../mock-data';

/**
 * A categoria fica no menu, e não numa segunda fileira de abas: são quatro
 * linhas de serviço hoje e nasce uma a cada campanha nova — abas cresceriam
 * sobre a busca. Os itens são `Link`, então o recorte continua morando na URL.
 */
export function CategoryFilter({ params }: { params: CampaignParams }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="data-[state=open]:bg-ink-50">
          <ListFilter aria-hidden />
          {params.category ?? 'Filtros'}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem asChild>
          <Link href={campaignsHref(params, { category: null })}>
            {params.category === null && <Check aria-hidden />}
            Todas as categorias
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {CAMPAIGN_CATEGORIES.map((category) => (
          <DropdownMenuItem key={category} asChild>
            <Link href={campaignsHref(params, { category })}>
              {params.category === category && <Check aria-hidden />}
              {category}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
