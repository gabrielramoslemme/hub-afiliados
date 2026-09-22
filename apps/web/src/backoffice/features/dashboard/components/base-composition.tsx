import { affiliateBase, type SegmentTone } from '../lib/mock-data';
import { Panel } from './panel';

/**
 * A mesma cor que o `Badge` da fila dá a cada situação. Sai do token e não de um
 * hex: a barra e a etiqueta precisam mudar juntas, senão a analista aprende duas
 * cores para o mesmo estado.
 */
const TONE_COLOR: Record<SegmentTone, string> = {
  approved: 'bg-[var(--status-approved)]',
  pending: 'bg-[var(--status-pending)]',
  inactive: 'bg-[var(--status-inactive)]',
  rejected: 'bg-[var(--status-rejected)]',
};

export function BaseComposition() {
  const { total, segments } = affiliateBase;

  return (
    <Panel className="flex flex-col p-5" aria-label="Composição da base atual">
      <p className="text-sm text-ink-500">Composição da base atual</p>
      <p className="mt-1 text-[1.75rem] font-bold leading-tight text-ink-900" data-tabular>
        {total} afiliados
      </p>

      {/*
        Grade com uma fração por segmento, e não larguras em porcentagem: com
        `gap`, porcentagens somam 100% mais os vãos e a última fatia vaza para
        fora do trilho.
      */}
      <div
        className="mt-5 grid h-2.5 gap-1"
        style={{ gridTemplateColumns: segments.map((segment) => `${segment.count}fr`).join(' ') }}
        aria-hidden
      >
        {segments.map((segment) => (
          <span key={segment.label} className={`rounded-pill ${TONE_COLOR[segment.tone]}`} />
        ))}
      </div>

      {/* Duas colunas: a lista em coluna única deixava metade do painel vazia ao
          lado de um bloco que continua crescendo. */}
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2.5 text-sm text-ink-700">
            <span
              className={`size-2.5 shrink-0 rounded-[3px] ${TONE_COLOR[segment.tone]}`}
              aria-hidden
            />
            <span data-tabular>
              {segment.label} — {segment.count}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
