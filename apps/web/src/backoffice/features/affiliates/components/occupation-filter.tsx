'use client';

import { OccupationEnum } from '@porto/contracts';
import { cn } from '@/shared/lib/cn';
import { occupationName } from '@/shared/lib/format';

/**
 * `select` nativo dentro do `form` GET da fila: o estado continua na URL. O
 * único JavaScript é enviar o formulário ao trocar a opção — sem ele, o Enter
 * na busca envia a ocupação junto do mesmo jeito.
 */
export function OccupationFilter({ value }: { value: OccupationEnum | null }) {
  return (
    <select
      name="occupation"
      defaultValue={value ?? ''}
      aria-label="Filtrar por ocupação"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className={cn(
        'h-9 rounded-md border border-input bg-background px-3 text-[0.8125rem] text-foreground',
        'transition-[border-color,box-shadow] duration-150 hover:border-ink-400',
        'focus-visible:border-ring focus-visible:outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-blue-600/15',
      )}
    >
      <option value="">Todas as ocupações</option>
      {Object.values(OccupationEnum).map((occupation) => (
        <option key={occupation} value={occupation}>
          {occupationName(occupation)}
        </option>
      ))}
    </select>
  );
}
