import {
  AffiliateStatusEnum,
  type AffiliateStatusHistoryItem,
  type CouponHistoryItem,
  CouponStatusEnum,
} from '@porto/contracts';
import { buildTrail, type TrailEntry } from './trail';

function statusEntry(
  overrides: Partial<AffiliateStatusHistoryItem> = {},
): AffiliateStatusHistoryItem {
  return {
    fromStatus: AffiliateStatusEnum.PENDING_APPROVAL,
    toStatus: AffiliateStatusEnum.APPROVED,
    reason: null,
    actorName: 'Analista Porto',
    createdAt: '2026-08-25T12:00:00.000Z',
    ...overrides,
  };
}

function couponEntry(overrides: Partial<CouponHistoryItem> = {}): CouponHistoryItem {
  return {
    fromStatus: CouponStatusEnum.ACTIVE,
    toStatus: CouponStatusEnum.INACTIVE,
    fromDiscountPercent: 10,
    toDiscountPercent: 10,
    actorName: 'Analista Porto',
    createdAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

const issue = couponEntry({
  fromStatus: null,
  toStatus: CouponStatusEnum.ACTIVE,
  fromDiscountPercent: null,
  toDiscountPercent: 10,
  createdAt: '2026-08-25T12:00:00.000Z',
});

function titles(trail: TrailEntry[]): string[] {
  return trail.map((entry) => entry.title);
}

describe('buildTrail', () => {
  it('names the registration events as it always did', () => {
    const received = statusEntry({
      fromStatus: null,
      toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      actorName: null,
      createdAt: '2026-08-17T12:00:00.000Z',
    });

    expect(titles(buildTrail([statusEntry(), received], []))).toEqual([
      'Em análise → Aprovado',
      'Cadastro recebido',
    ]);
  });

  it('carries the reason and who acted', () => {
    const [entry] = buildTrail(
      [statusEntry({ toStatus: AffiliateStatusEnum.REJECTED, reason: 'CPF divergente' })],
      [],
    );

    expect(entry).toMatchObject({ reason: 'CPF divergente', actorName: 'Analista Porto' });
  });

  it('names the coupon issue with the discount it carried', () => {
    expect(titles(buildTrail([], [issue]))).toEqual(['Cupom emitido com 10% de desconto']);
  });

  it('names a deactivation', () => {
    expect(titles(buildTrail([], [couponEntry()]))).toEqual(['Cupom desativado']);
  });

  it('names a reactivation', () => {
    const reactivated = couponEntry({
      fromStatus: CouponStatusEnum.INACTIVE,
      toStatus: CouponStatusEnum.ACTIVE,
    });

    expect(titles(buildTrail([], [reactivated]))).toEqual(['Cupom reativado']);
  });

  it('names a discount change', () => {
    const discounted = couponEntry({
      toStatus: CouponStatusEnum.ACTIVE,
      toDiscountPercent: 15,
    });

    expect(titles(buildTrail([], [discounted]))).toEqual(['Desconto de 10% para 15%']);
  });

  it('names both changes when they came together', () => {
    expect(titles(buildTrail([], [couponEntry({ toDiscountPercent: 15 })]))).toEqual([
      'Cupom desativado · Desconto de 10% para 15%',
    ]);
  });

  it('mixes both trails, newest first', () => {
    const received = statusEntry({
      fromStatus: null,
      toStatus: AffiliateStatusEnum.PENDING_APPROVAL,
      createdAt: '2026-08-17T12:00:00.000Z',
    });

    expect(titles(buildTrail([statusEntry(), received], [couponEntry()]))).toEqual([
      'Cupom desativado',
      'Em análise → Aprovado',
      'Cadastro recebido',
    ]);
  });

  /*
    Cupom e aprovação são gravados na mesma transação e saem com o mesmo
    instante. Lida de baixo para cima, a trilha tem que contar a aprovação antes
    do cupom que ela emitiu.
  */
  it('shows the coupon issue above the approval it came with', () => {
    expect(titles(buildTrail([statusEntry()], [issue]))).toEqual([
      'Cupom emitido com 10% de desconto',
      'Em análise → Aprovado',
    ]);
  });

  it('gives every entry a key of its own, even at the same instant', () => {
    const keys = buildTrail([statusEntry()], [issue]).map((entry) => entry.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
