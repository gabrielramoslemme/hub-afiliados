import {
  type AffiliateMeResponse,
  AffiliateStatusEnum,
  OccupationEnum,
  PixKeyTypeEnum,
  SocialNetworkEnum,
} from '@porto/contracts';
import { type ProfileField, profileRows } from './profile-rows';

const account: AffiliateMeResponse = {
  publicId: '10000000-0000-4000-8000-000000000001',
  name: 'Marina Ferraz',
  email: 'marina@email.com',
  cpf: '52998224725',
  maskedCpf: '***.***.247-25',
  rg: '12345678X',
  maskedRg: '*****678X',
  occupation: OccupationEnum.INFLUENCER,
  socialNetwork: SocialNetworkEnum.INSTAGRAM,
  socialHandle: 'marina.ferraz',
  pixKeyType: PixKeyTypeEnum.PHONE,
  pixKey: '11987654321',
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

  it('opens the documents masked and keeps the whole value formatted for the reveal', () => {
    expect(row('cpf')).toMatchObject({ value: '***.***.247-25', revealed: '529.982.247-25' });
    expect(row('rg')).toMatchObject({ value: '*****678X', revealed: '12345678X' });
    expect(row('pixKey')).toMatchObject({
      value: '(11) *****-4321',
      revealed: '(11) 98765-4321',
    });
  });

  it('has nothing to reveal on a field that is not a document', () => {
    expect(row('name')).not.toHaveProperty('revealed');
    expect(row('email')).not.toHaveProperty('revealed');
    expect(row('social')).not.toHaveProperty('revealed');
  });

  it('keeps the social network line when the optional field was left blank', () => {
    const withoutSocial = { ...account, socialNetwork: null, socialHandle: null };

    expect(row('social', withoutSocial)?.value).toBe('Não informada');
    expect(row('social')?.value).toBe('@marina.ferraz no Instagram');
  });
});
