import {
  type AffiliateAuditLogItem,
  type AffiliateStatusEnum,
  AuditChangeTypeEnum,
  AuditEntityEnum,
  CouponStatusEnum,
  type OccupationEnum,
  PixKeyTypeEnum,
  UserTypeEnum,
} from '@porto/contracts';
import { statusLabel } from '@/shared/lib/affiliate-status';
import { formatPixKeyDisplay, occupationName, pixKeyTypeName } from '@/shared/lib/format';

/** Uma linha da trilha de auditoria do detalhe. */
export interface TrailEntry {
  key: string;
  title: string;
  createdAt: string;
  /** Quem agiu, já como a tela escreve: o nome da analista ou "pelo próprio afiliado". */
  actor: string;
  reason: string | null;
}

type Diff = AffiliateAuditLogItem['diff'];

function isPixKeyType(value: unknown): value is PixKeyTypeEnum {
  return Object.values(PixKeyTypeEnum).includes(value as PixKeyTypeEnum);
}

/** A chave só ganha pontuação quando o tipo dela está no mesmo registro. */
function pixKey(value: unknown, type: unknown): string {
  return isPixKeyType(type) ? formatPixKeyDisplay(type, String(value)) : String(value);
}

function couponTitle(item: AffiliateAuditLogItem): string {
  const { diff } = item;

  if (item.changeType === AuditChangeTypeEnum.CREATE) {
    return `Cupom ${diff.code?.to} emitido com ${diff.discountPercent?.to}% de desconto`;
  }

  const parts: string[] = [];

  if (diff.status) {
    parts.push(
      diff.status.to === CouponStatusEnum.INACTIVE ? 'Cupom desativado' : 'Cupom reativado',
    );
  }
  if (diff.discountPercent) {
    parts.push(`Desconto de ${diff.discountPercent.from}% para ${diff.discountPercent.to}%`);
  }

  return parts.join(' · ');
}

/*
  Uma parte por campo, na ordem do `diff`. Campo que a tela ainda não conhece
  aparece pelo nome da propriedade: melhor um rótulo cru na trilha do que uma
  alteração que some dela.
*/
function profileTitle(diff: Diff): string {
  return Object.entries(diff)
    .map(([field, { from, to }]) => {
      switch (field) {
        case 'occupation':
          return `Ocupação: ${occupationName(from as OccupationEnum)} → ${occupationName(to as OccupationEnum)}`;
        case 'email':
          return `E-mail: ${from} → ${to}`;
        case 'pixKeyType':
          return `Tipo de chave PIX: ${pixKeyTypeName(from as PixKeyTypeEnum)} → ${pixKeyTypeName(to as PixKeyTypeEnum)}`;
        case 'pixKey':
          return `Chave PIX: ${pixKey(from, diff.pixKeyType?.from)} → ${pixKey(to, diff.pixKeyType?.to)}`;
        default:
          return `${field}: ${from} → ${to}`;
      }
    })
    .join(' · ');
}

function affiliateTitle(item: AffiliateAuditLogItem): string {
  if (item.changeType === AuditChangeTypeEnum.CREATE) return 'Cadastro recebido';

  const { status } = item.diff;
  if (status) {
    return `${statusLabel(status.from as AffiliateStatusEnum)} → ${statusLabel(status.to as AffiliateStatusEnum)}`;
  }

  return profileTitle(item.diff);
}

/*
  Sem autor é o cadastro público, e o autor afiliado só pode ser o dono da
  conta: o canal dele não edita cadastro de terceiros.
*/
function actorOf(item: AffiliateAuditLogItem): string {
  return item.actorType === UserTypeEnum.ADMIN && item.actorName
    ? item.actorName
    : 'pelo próprio afiliado';
}

/**
 * A trilha de auditoria do detalhe, na ordem em que a API responde — da mais
 * recente para a mais antiga, com cadastro, status, perfil e cupom juntos.
 */
export function buildTrail(entries: AffiliateAuditLogItem[]): TrailEntry[] {
  return entries.map((item, index) => ({
    key: `${item.createdAt}-${index}`,
    title: item.entity === AuditEntityEnum.COUPON ? couponTitle(item) : affiliateTitle(item),
    createdAt: item.createdAt,
    actor: actorOf(item),
    reason: item.justification,
  }));
}
