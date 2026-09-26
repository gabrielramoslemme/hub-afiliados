const DAY_MS = 24 * 60 * 60 * 1000;

/** O dia do filtro é o de Brasília: é nele que a analista pensa "saques de ontem". */
function startOfDayInBrasilia(day: string): Date {
  return new Date(`${day}T00:00:00-03:00`);
}

export interface RequestedRangeFilter {
  from?: string;
  until?: string;
}

export interface RequestedRange {
  requestedFrom: Date | null;
  requestedUntil: Date | null;
}

/**
 * Converte o filtro de dia, em Brasília, num intervalo de instantes UTC. O
 * limite superior é o começo do dia seguinte, exclusive: sem isso, o saque
 * das 23:59 em Brasília no último dia do filtro ficaria de fora.
 */
export function toRequestedRange({ from, until }: RequestedRangeFilter): RequestedRange {
  return {
    requestedFrom: from ? startOfDayInBrasilia(from) : null,
    requestedUntil: until ? new Date(startOfDayInBrasilia(until).getTime() + DAY_MS) : null,
  };
}
