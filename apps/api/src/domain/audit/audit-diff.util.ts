import { AuditDiff } from './audit-log.entity';

type Snapshot = Readonly<Record<string, unknown>>;

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

/**
 * Compara só os campos de `after`, que é a mudança pedida: o `before` costuma
 * ser a linha inteira, e o que ela tem além disso não mudou. Campo ausente ou
 * `undefined` em `after` é "não mexe", como nos adapters.
 *
 * A comparação é por valor serializado, para que duas `Date` do mesmo instante
 * contem como iguais.
 */
export function buildAuditDiff(before: Snapshot, after: Snapshot): AuditDiff {
  const diff: AuditDiff = {};

  for (const [field, value] of Object.entries(after)) {
    if (value === undefined) continue;

    const from = normalize(before[field]);
    const to = normalize(value);

    if (JSON.stringify(from) !== JSON.stringify(to)) diff[field] = { from, to };
  }

  return diff;
}
