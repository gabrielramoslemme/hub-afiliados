import { EntityManager } from 'typeorm';
import { AuditChangeTypeEnum } from '@porto/contracts';
import { buildAuditDiff } from '@Domain/audit/audit-diff.util';
import { AuditTarget } from '@Domain/audit/audit-log.entity';
import { AuditLogTypeormEntity } from '@Infra/database/typeorm/entities/audit-log.typeorm-entity';

/**
 * Registra uma edição em `audit_logs`, na transação de quem chama. Recebe o
 * `manager` porque a linha da trilha tem que voltar junto com a mudança que ela
 * descreve — é o que o repositório de cada entidade garante, e por isso isto
 * mora em infra e nunca atravessa o contrato.
 *
 * `before` precisa sair da linha travada pela mesma transação. Sem campo que de
 * fato mudou, não grava nada: uma linha com `diff` vazio só faria barulho na
 * trilha.
 */
export async function recordAuditLog(
  manager: EntityManager,
  target: AuditTarget,
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): Promise<void> {
  const diff = buildAuditDiff(before, after);
  if (Object.keys(diff).length === 0) return;

  // `save`, e não `insert`: o tipo do `insert` trata o objeto da coluna `jsonb`
  // como entidade aninhada e recusa o `diff`.
  await manager.save(
    AuditLogTypeormEntity,
    manager.create(AuditLogTypeormEntity, {
      ...target,
      changeType: AuditChangeTypeEnum.UPDATE,
      diff,
    }),
  );
}
