import {
  type AffiliateReportRow,
  AffiliateStatusEnum,
  CouponStatusEnum,
  OccupationEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { affiliatesSheetFileName, buildAffiliatesSheet } from './affiliates-sheet';

function reportRow(overrides: Partial<AffiliateReportRow> = {}): AffiliateReportRow {
  return {
    name: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '52998224725',
    rg: '12345678X',
    occupation: OccupationEnum.INFLUENCER,
    socialNetwork: SocialNetworkEnum.INSTAGRAM,
    socialHandle: 'marina.ferraz',
    pixKeyType: PixKeyTypeEnum.PHONE,
    pixKey: '11987654321',
    status: AffiliateStatusEnum.APPROVED,
    createdAt: '2026-09-01T02:00:00.000Z',
    approvedAt: '2026-09-02T15:30:00.000Z',
    coupon: { code: 'MARINA10', discountPercent: 10, status: CouponStatusEnum.ACTIVE },
    completedSalesCount: 2,
    completedSalesCents: 41099,
    releasedIncentiveCents: 2500,
    paidCommissionCents: null,
    ...overrides,
  };
}

function onlyRow(overrides: Partial<AffiliateReportRow> = {}) {
  const [row] = buildAffiliatesSheet([reportRow(overrides)]).rows;

  return row;
}

describe('buildAffiliatesSheet', () => {
  it('has a column for each figure the panel asked for', () => {
    const headers = buildAffiliatesSheet([]).columns.map((column) => column.header);

    expect(headers).toEqual(
      expect.arrayContaining([
        'Nome',
        'E-mail',
        'Situação',
        'Cadastrado em',
        'Cupom',
        'Nº de vendas',
        'Valor das vendas (R$)',
        'Incentivos liberados (R$)',
        'Comissão paga (R$)',
      ]),
    );
  });

  it('writes one row per affiliate, in the order the api answered', () => {
    const sheet = buildAffiliatesSheet([
      reportRow({ name: 'Cleide Nakamura' }),
      reportRow({ name: 'Marina Ferraz' }),
    ]);

    expect(sheet.rows.map((row) => row.name)).toEqual(['Cleide Nakamura', 'Marina Ferraz']);
  });

  // Número, e não texto formatado: quem abre a planilha quer somar a coluna.
  it('turns cents into reais as numbers', () => {
    expect(onlyRow()).toMatchObject({
      completedSalesCount: 2,
      completedSalesAmount: 410.99,
      releasedIncentiveAmount: 25,
    });
  });

  // Zero diria que nada foi pago; vazio diz que o dado ainda não existe.
  it('leaves the paid commission empty while the api has none', () => {
    expect(onlyRow().paidCommissionAmount).toBeNull();
  });

  it('carries the paid commission once the api has it', () => {
    expect(onlyRow({ paidCommissionCents: 1250 }).paidCommissionAmount).toBe(12.5);
  });

  it('leaves the coupon cells empty for an affiliate without a coupon', () => {
    expect(onlyRow({ coupon: null })).toMatchObject({
      couponCode: null,
      couponDiscount: null,
      couponStatus: null,
    });
  });

  it('writes the whole documents, punctuated', () => {
    expect(onlyRow()).toMatchObject({
      cpf: '529.982.247-25',
      rg: '12345678X',
      pixKey: '(11) 98765-4321',
    });
  });

  it('names statuses, occupation and pix type the way the panel does', () => {
    expect(onlyRow()).toMatchObject({
      status: 'Aprovado',
      occupation: 'Influenciador',
      pixKeyType: 'Telefone',
      socialProfile: '@marina.ferraz no Instagram',
      couponStatus: 'Ativo',
    });
  });

  it('writes dates in São Paulo time', () => {
    expect(onlyRow()).toMatchObject({
      createdAt: '31/08/2026 23:00',
      approvedAt: '02/09/2026 12:30',
    });
  });
});

describe('affiliatesSheetFileName', () => {
  it('dates the file in São Paulo, not in UTC', () => {
    expect(affiliatesSheetFileName(new Date('2026-09-26T01:30:00.000Z'))).toBe(
      'afiliados-2026-09-25.xlsx',
    );
  });
});
