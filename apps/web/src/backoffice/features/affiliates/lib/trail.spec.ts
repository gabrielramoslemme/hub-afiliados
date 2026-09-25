import {
  type AffiliateAuditLogItem,
  AuditChangeTypeEnum,
  AuditEntityEnum,
  UserTypeEnum,
} from '@porto/contracts';
import { buildTrail, type TrailEntry } from './trail';

function entry(overrides: Partial<AffiliateAuditLogItem> = {}): AffiliateAuditLogItem {
  return {
    entity: AuditEntityEnum.AFFILIATE,
    changeType: AuditChangeTypeEnum.UPDATE,
    diff: { status: { from: 'PENDING_APPROVAL', to: 'APPROVED' } },
    justification: null,
    actorName: 'Analista Porto',
    actorType: UserTypeEnum.ADMIN,
    createdAt: '2026-08-25T12:00:00.000Z',
    ...overrides,
  };
}

function coupon(diff: AffiliateAuditLogItem['diff'], changeType = AuditChangeTypeEnum.UPDATE) {
  return entry({ entity: AuditEntityEnum.COUPON, changeType, diff });
}

function titles(trail: TrailEntry[]): string[] {
  return trail.map((item) => item.title);
}

describe('buildTrail', () => {
  it('names the registration and each status transition', () => {
    const received = entry({
      changeType: AuditChangeTypeEnum.CREATE,
      diff: { status: { from: null, to: 'PENDING_APPROVAL' } },
      actorName: null,
      actorType: null,
    });

    expect(titles(buildTrail([entry(), received]))).toEqual([
      'Em análise → Aprovado',
      'Cadastro recebido',
    ]);
  });

  it('keeps the order the api answered, newest first', () => {
    const older = entry({ createdAt: '2026-08-01T12:00:00.000Z' });
    const newer = coupon({ discountPercent: { from: 10, to: 15 } });

    expect(titles(buildTrail([newer, older]))).toEqual([
      'Desconto de 10% para 15%',
      'Em análise → Aprovado',
    ]);
  });

  it('carries the justification as the reason', () => {
    const [item] = buildTrail([
      entry({
        diff: { status: { from: 'PENDING_APPROVAL', to: 'REJECTED' } },
        justification: 'CPF divergente',
      }),
    ]);

    expect(item.reason).toBe('CPF divergente');
  });

  it('names the analyst who acted, and the affiliate as itself', () => {
    const byAffiliate = entry({
      diff: { occupation: { from: 'INFLUENCER', to: 'CONTENT_CREATOR' } },
      actorName: 'Marina Ferraz',
      actorType: UserTypeEnum.AFFILIATE,
    });
    const bySystem = entry({ actorName: null, actorType: null });

    expect(buildTrail([entry(), byAffiliate, bySystem]).map((item) => item.actor)).toEqual([
      'Analista Porto',
      'pelo próprio afiliado',
      'pelo próprio afiliado',
    ]);
  });

  it('names the coupon issue with its code and discount', () => {
    const issued = coupon(
      {
        code: { from: null, to: 'MARINA10' },
        status: { from: null, to: 'ACTIVE' },
        discountPercent: { from: null, to: 10 },
      },
      AuditChangeTypeEnum.CREATE,
    );

    expect(titles(buildTrail([issued]))).toEqual(['Cupom MARINA10 emitido com 10% de desconto']);
  });

  it('names a deactivation, a reactivation and a discount change together', () => {
    expect(
      titles(
        buildTrail([
          coupon({ status: { from: 'ACTIVE', to: 'INACTIVE' } }),
          coupon({
            status: { from: 'INACTIVE', to: 'ACTIVE' },
            discountPercent: { from: 10, to: 20 },
          }),
        ]),
      ),
    ).toEqual(['Cupom desativado', 'Cupom reativado · Desconto de 10% para 20%']);
  });

  it('names each profile edit with the value before and after', () => {
    expect(
      titles(
        buildTrail([
          entry({ diff: { occupation: { from: 'INFLUENCER', to: 'CONTENT_CREATOR' } } }),
          entry({ diff: { email: { from: 'marina@email.com', to: 'nova@email.com' } } }),
          entry({
            diff: {
              pixKeyType: { from: 'EMAIL', to: 'PHONE' },
              pixKey: { from: 'marina@email.com', to: '11987654321' },
            },
          }),
        ]),
      ),
    ).toEqual([
      'Ocupação: Influenciador → Criador de Conteúdo',
      'E-mail: marina@email.com → nova@email.com',
      'Tipo de chave PIX: E-mail → Telefone · Chave PIX: marina@email.com → (11) 98765-4321',
    ]);
  });
});
