import {
  type AffiliateMeResponse,
  AffiliateStatusEnum,
  OccupationEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { type ProfileField, profileRows, revealedDocuments } from './profile-rows';

const account: AffiliateMeResponse = {
  publicId: '10000000-0000-4000-8000-000000000001',
  name: 'Marina Ferraz',
  email: 'marina@email.com',
  maskedCpf: '***.***.247-25',
  maskedRg: '*****678X',
  occupation: OccupationEnum.INFLUENCER,
  socialNetwork: SocialNetworkEnum.INSTAGRAM,
  socialHandle: 'marina.ferraz',
  pixKeyType: PixKeyTypeEnum.PHONE,
  maskedPixKey: '(11) *****-4321',
  status: AffiliateStatusEnum.APPROVED,
  coupon: 'MARINA25',
  couponDiscountPercent: 10,
  createdAt: '2026-08-17T12:00:00Z',
};

function row(field: ProfileField, from = account) {
  return profileRows(from).find((candidate) => candidate.field === field);
}

describe('profileRows', () => {
  it('lists every field the affiliate filled in at sign-up, in the order of the form', () => {
    expect(profileRows(account).map(({ label }) => label)).toEqual([
      'Nome completo',
      'E-mail',
      'CPF',
      'RG',
      'Ocupação',
      'Tipo de chave PIX',
      'Chave PIX',
      'Rede social',
      'No programa desde',
    ]);
  });

  it('marks the documents as revealable, carrying only the masked value', () => {
    expect(row('cpf')).toMatchObject({ value: '***.***.247-25', revealable: true });
    expect(row('rg')).toMatchObject({ value: '*****678X', revealable: true });
    expect(row('pixKey')).toMatchObject({ value: '(11) *****-4321', revealable: true });
  });

  it('has nothing to reveal on a field that is not a document', () => {
    expect(row('name')).not.toHaveProperty('revealable');
    expect(row('email')).not.toHaveProperty('revealable');
    expect(row('social')).not.toHaveProperty('revealable');
  });

  it('keeps the social network line when the optional field was left blank', () => {
    const withoutSocial = { ...account, socialNetwork: null, socialHandle: null };

    expect(row('social', withoutSocial)?.value).toBe('Não informada');
    expect(row('social')?.value).toBe('@marina.ferraz no Instagram');
  });
});

describe('revealedDocuments', () => {
  it('formats the whole documents the way the masked ones are shown', () => {
    expect(
      revealedDocuments(
        { cpf: '52998224725', rg: '12345678X', pixKey: '11987654321' },
        PixKeyTypeEnum.PHONE,
      ),
    ).toEqual({ cpf: '529.982.247-25', rg: '12345678X', pixKey: '(11) 98765-4321' });
  });
});
