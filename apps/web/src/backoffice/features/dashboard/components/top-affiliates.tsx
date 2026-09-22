import { Crown } from 'lucide-react';
import Link from 'next/link';
import { QUEUE_PATH } from '@/backoffice/shared/routes';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatBRL } from '@/shared/lib/format';
import { topAffiliates } from '../lib/mock-data';
import { Panel } from './panel';

const salesFormatter = new Intl.NumberFormat('pt-BR');

/** Coroa nos três primeiros, na ordem do pódio; do quarto em diante, o número. */
const CROWN_COLOR = ['text-[var(--color-chart-3)]', 'text-blue-500', 'text-ink-400'];

export function TopAffiliates() {
  const totals = topAffiliates.reduce(
    (sum, affiliate) => ({
      sales: sum.sales + affiliate.sales,
      revenueCents: sum.revenueCents + affiliate.revenueCents,
      commissionCents: sum.commissionCents + affiliate.commissionCents,
    }),
    { sales: 0, revenueCents: 0, commissionCents: 0 },
  );

  return (
    <Panel className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-ink-50/60 hover:bg-ink-50/60">
            <TableHead className="w-16">#</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Vendas</TableHead>
            <TableHead className="text-right">Receita gerada</TableHead>
            <TableHead className="text-right">Comissão total</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {topAffiliates.map((affiliate, index) => (
            <TableRow key={affiliate.name}>
              <TableCell data-tabular>
                {index < CROWN_COLOR.length ? (
                  <>
                    <Crown className={`size-4 ${CROWN_COLOR[index]}`} aria-hidden />
                    <span className="sr-only">{index + 1}º lugar</span>
                  </>
                ) : (
                  index + 1
                )}
              </TableCell>
              <TableCell>
                {/*
                  O ranking é exemplo e não tem `public_id` para apontar, então o
                  nome leva à busca da fila — que é onde a analista encontraria
                  essa pessoa de verdade. Link que não abre nada seria pior que
                  texto puro.
                */}
                <Link
                  href={`${QUEUE_PATH}?search=${encodeURIComponent(affiliate.name)}`}
                  className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  {affiliate.name}
                </Link>
              </TableCell>
              <TableCell className="text-ink-500">{affiliate.category}</TableCell>
              {/* Número alinhado à direita: é assim que a coluna vira comparável
                  de relance, sem o olho ter que voltar ao começo de cada linha. */}
              <TableCell className="text-right" data-tabular>
                {salesFormatter.format(affiliate.sales)}
              </TableCell>
              <TableCell className="text-right" data-tabular>
                {formatBRL(affiliate.revenueCents)}
              </TableCell>
              <TableCell className="text-right" data-tabular>
                {formatBRL(affiliate.commissionCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        {/* A soma fecha o recorte que a tabela acabou de listar — e é a mesma
            taxa de comissão que vale no resto da tela, agora somada à vista. */}
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={3} className="text-ink-900">
              Soma dos {topAffiliates.length}
            </TableCell>
            <TableCell className="text-right text-ink-900" data-tabular>
              {salesFormatter.format(totals.sales)}
            </TableCell>
            <TableCell className="text-right text-ink-900" data-tabular>
              {formatBRL(totals.revenueCents)}
            </TableCell>
            <TableCell className="text-right text-ink-900" data-tabular>
              {formatBRL(totals.commissionCents)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Panel>
  );
}
