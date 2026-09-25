import { IncentiveStatusEnum, StatementEntryKindEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildSale } from '@Testing/factories/sale.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { saleRepositoryMock } from '@Testing/mocks/repositories/sale.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { GetAffiliateWalletUseCase } from './get-affiliate-wallet.use-case';

describe('GetAffiliateWalletUseCase', () => {
  const NOW = new Date('2026-09-25T15:00:00.000Z');

  let userRepository: ReturnType<typeof userRepositoryMock>;
  let saleRepository: ReturnType<typeof saleRepositoryMock>;
  let useCase: GetAffiliateWalletUseCase;

  const user = buildUser();

  beforeEach(() => {
    userRepository = userRepositoryMock();
    saleRepository = saleRepositoryMock();
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      affiliate: buildAffiliate({ user, coupon: buildCoupon({ id: 7 }) }),
    });
    useCase = new GetAffiliateWalletUseCase(userRepository, saleRepository, clockMock(NOW));
  });

  /*
    Só entra no extrato o incentivo liberado: o pendente ainda depende do
    serviço, e o cancelado nunca vai render nada.
  */
  it('lists only released incentives, newest release first, and sums them', async () => {
    saleRepository.listByCoupon.mockResolvedValue([
      buildSale({ incentiveStatus: IncentiveStatusEnum.PENDING, incentiveCents: 500 }),
      buildSale({
        item: 'Conserto de fogão',
        incentiveStatus: IncentiveStatusEnum.RELEASED,
        incentiveCents: 2700,
        settledAt: new Date('2026-09-10T12:00:00Z'),
      }),
      buildSale({
        item: 'Guincho 24h',
        incentiveStatus: IncentiveStatusEnum.RELEASED,
        incentiveCents: 1300,
        settledAt: new Date('2026-09-20T12:00:00Z'),
      }),
      buildSale({
        incentiveStatus: IncentiveStatusEnum.CANCELED,
        incentiveCents: 900,
        settledAt: new Date('2026-09-21T12:00:00Z'),
      }),
    ]);

    const wallet = await useCase.execute(user.publicId);

    expect(wallet.releasedCents).toBe(4000);
    expect(wallet.entries).toEqual([
      expect.objectContaining({
        kind: StatementEntryKindEnum.INCENTIVE,
        title: 'Guincho 24h',
        cents: 1300,
        occurredAt: new Date('2026-09-20T12:00:00Z'),
      }),
      expect.objectContaining({ title: 'Conserto de fogão', cents: 2700 }),
    ]);
  });

  it('answers an empty wallet for an affiliate still without a coupon', async () => {
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      affiliate: buildAffiliate({ user, coupon: null }),
    });

    const wallet = await useCase.execute(user.publicId);

    expect(wallet).toEqual({ releasedCents: 0, updatedAt: NOW, entries: [] });
    expect(saleRepository.listByCoupon).not.toHaveBeenCalled();
  });

  it('refuses a token whose user has no affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(user.publicId)).rejects.toThrow(UnknownAffiliateError);
  });
});
