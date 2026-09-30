/**
 * A lista depois de soltar `activeId` sobre `overId` — ou nulo quando nada
 * mudou: soltar no mesmo lugar, fora da lista ou com um id desconhecido não
 * pode virar uma volta à API.
 */
export function moveItem(
  ids: readonly string[],
  activeId: string,
  overId: string | null,
): string[] | null {
  if (overId === null || activeId === overId) return null;

  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1) return null;

  const moved = [...ids];
  moved.splice(to, 0, ...moved.splice(from, 1));
  return moved;
}

/** O que o leitor de tela anuncia enquanto o item anda pela lista. */
export function positionAnnouncement(title: string, index: number, total: number): string {
  return `${title} está na posição ${index + 1} de ${total}.`;
}
