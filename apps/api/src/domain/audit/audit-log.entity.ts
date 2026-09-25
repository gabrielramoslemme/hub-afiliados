import { AuditChangeTypeEnum, AuditEntityEnum } from '@porto/contracts';

/** O antes e o depois de cada campo que mudou, pelo nome da propriedade. */
export type AuditDiff = Record<string, { from: unknown; to: unknown }>;

/**
 * Uma alteração de registro, de qualquer entidade. Append-only: gravada na mesma
 * transação da mudança que descreve, nunca editada nem apagada.
 *
 * Os valores ficam completos, chave PIX inclusive — é o que responde "para onde
 * ia o pagamento antes" quando um desvio é investigado. Por isso a tabela é
 * dado, não log: nada daqui é escrito no `Logger`.
 */
export interface AuditLogEntity {
  id: number;
  entity: AuditEntityEnum;
  /** O `id` interno do registro, que nunca sai da API. */
  entityId: number;
  /** Nulo quando quem age é o próprio sistema. */
  actorUserId: number | null;
  changeType: AuditChangeTypeEnum;
  diff: AuditDiff;
  createdAt: Date;
}

/**
 * A quem pertence a alteração e quem responde por ela. O diff não vem junto: o
 * adapter o calcula a partir da linha travada, dentro da transação — recebê-lo
 * de fora permitiria registrar um "antes" que outra escrita já envelheceu.
 */
export interface AuditTarget {
  entity: AuditEntityEnum;
  entityId: number;
  actorUserId: number | null;
}
