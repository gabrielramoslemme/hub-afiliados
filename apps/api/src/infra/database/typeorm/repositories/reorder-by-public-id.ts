import { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';

/**
 * Regrava `position` de 1 a N na ordem dos `publicIds`, numa transação, se — e
 * só se — a lista for exatamente a das linhas que existem. As linhas ficam
 * travadas durante a conferência: sem isso, um item criado entre a leitura e a
 * escrita ficaria com a posição antiga no meio da ordem nova.
 *
 * Os dois repositórios de materiais têm a mesma tabela em forma, e a regra é
 * uma só; por isso mora aqui, e não copiada em cada adapter.
 */
export async function reorderByPublicId<T extends { id: number; publicId: string }>(
  manager: EntityManager,
  target: EntityTarget<T>,
  publicIds: string[],
): Promise<boolean> {
  const rows = (await manager
    .getRepository(target)
    .createQueryBuilder('row')
    .select(['row.id', 'row.publicId'])
    .setLock('pessimistic_write')
    .getMany()) as Array<Pick<T, 'id' | 'publicId'>>;

  const existing = new Set(rows.map((row) => row.publicId));
  const sameItems =
    rows.length === publicIds.length && publicIds.every((publicId) => existing.has(publicId));
  if (!sameItems) return false;

  const idByPublicId = new Map(rows.map((row) => [row.publicId, row.id]));
  const { tableName } = manager.getRepository(target).metadata;

  // Uma instrução só, com a posição de cada linha vinda da ordem dada.
  await manager.query(
    `UPDATE "${tableName}" AS item SET "position" = ordered.position, "updated_at" = now()
       FROM unnest($1::int[]) WITH ORDINALITY AS ordered(id, position)
      WHERE item.id = ordered.id`,
    [publicIds.map((publicId) => idByPublicId.get(publicId))],
  );

  return true;
}

/** A posição de um item novo: depois do último. */
export async function nextPosition<T extends ObjectLiteral>(
  manager: EntityManager,
  target: EntityTarget<T>,
): Promise<number> {
  const { max } = (await manager
    .getRepository(target)
    .createQueryBuilder('row')
    .select('COALESCE(MAX(row.position), 0)', 'max')
    .getRawOne<{ max: number }>()) ?? { max: 0 };

  return Number(max) + 1;
}
