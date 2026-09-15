import { CouponStatusEnum } from '@porto/contracts';
import { AffiliateNotFoundError } from '@Domain/affiliates/affiliates.errors';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import {
  CouponNotFoundError,
  CouponProviderUnavailableError,
  EmptyCouponChangeError,
} from '@Domain/coupons/coupons.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildAdminUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { couponRepositoryMock } from '@Testing/mocks/repositories/coupon.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { couponGatewayMock } from '@Testing/mocks/services/coupon-gateway.mock';
import { ChangeAffiliateCouponUseCase } from './change-affiliate-coupon.use-case';

describe('ChangeAffiliateCouponUseCase', () => {
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let couponRepository: ReturnType<typeof couponRepositoryMock>;
  let couponGateway: ReturnType<typeof couponGatewayMock>;
  let useCase: ChangeAffiliateCouponUseCase;

  const coupon = buildCoupon({ id: 7, code: 'MARINA25', discountPercent: 10 });
  const affiliate = buildAffiliate();
  const operator = buildAdminUser({ name: 'Analista Porto' });

  function input(changes: { status?: CouponStatusEnum; discountPercent?: number }) {
    return { publicId: affiliate.publicId, actorPublicId: operator.publicId, ...changes };
  }

  beforeEach(() => {
    affiliateRepository = affiliateRepositoryMock();
    userRepository = userRepositoryMock();
    couponRepository = couponRepositoryMock();
    couponGateway = couponGatewayMock();

    affiliateRepository.findByPublicId.mockResolvedValue({
      ...affiliate,
      approvedBy: null,
      coupon,
    });
    userRepository.findByPublicId.mockResolvedValue({ ...operator, affiliate: null });
    couponRepository.change.mockImplementation(async (change) =>
      buildCoupon({
        ...coupon,
        discountPercent: change.discountPercent ?? coupon.discountPercent,
        status: change.status ?? coupon.status,
      }),
    );

    useCase = new ChangeAffiliateCouponUseCase(
      affiliateRepository,
      userRepository,
      couponRepository,
      couponGateway,
    );
  });

  it('deactivates the coupon at the provider', async () => {
    await useCase.execute(input({ status: CouponStatusEnum.INACTIVE }));

    expect(couponGateway.change).toHaveBeenCalledWith({
      code: 'MARINA25',
      status: CouponStatusEnum.INACTIVE,
      discountPercent: undefined,
    });
  });

  it('answers with the coupon as it ended up', async () => {
    await expect(useCase.execute(input({ status: CouponStatusEnum.INACTIVE }))).resolves.toEqual({
      code: 'MARINA25',
      discountPercent: 10,
      status: CouponStatusEnum.INACTIVE,
    });
  });

  it('changes the discount percent', async () => {
    await expect(useCase.execute(input({ discountPercent: 15 }))).resolves.toMatchObject({
      discountPercent: 15,
    });
  });

  /* A mesma ordem da aprovação: a Porto registra antes de a gente gravar. */
  it('changes it at the provider before writing to our database', async () => {
    couponGateway.change.mockRejectedValue(new CouponProviderUnavailableError());

    await expect(useCase.execute(input({ status: CouponStatusEnum.INACTIVE }))).rejects.toThrow(
      CouponProviderUnavailableError,
    );

    expect(couponRepository.change).not.toHaveBeenCalled();
  });

  /*
    O cupom é nosso, e a Porto só o registra: o que se grava é o que a analista
    pediu, depois de a Porto aceitar — nunca o eco que ela devolve. E a trilha
    precisa dizer quem pediu, não só que mudou.
  */
  it('writes what the analyst asked once the provider accepts it, and who asked', async () => {
    await useCase.execute(input({ discountPercent: 15 }));

    expect(couponRepository.change).toHaveBeenCalledWith({
      couponId: 7,
      discountPercent: 15,
      status: undefined,
      actorUserId: operator.id,
    });
  });

  it('refuses a change that carries nothing, before reaching the provider', async () => {
    await expect(useCase.execute(input({}))).rejects.toThrow(EmptyCouponChangeError);
    expect(couponGateway.change).not.toHaveBeenCalled();
  });

  it('reports an affiliate that does not exist', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input({ status: CouponStatusEnum.INACTIVE }))).rejects.toThrow(
      AffiliateNotFoundError,
    );
  });

  it('reports an affiliate that has no coupon because it was never approved', async () => {
    affiliateRepository.findByPublicId.mockResolvedValue({
      ...affiliate,
      approvedBy: null,
      coupon: null,
    });

    await expect(useCase.execute(input({ status: CouponStatusEnum.INACTIVE }))).rejects.toThrow(
      CouponNotFoundError,
    );
    expect(couponGateway.change).not.toHaveBeenCalled();
  });

  it('refuses a token of an operator that is gone, before reaching the provider', async () => {
    userRepository.findByPublicId.mockResolvedValue(null);

    await expect(useCase.execute(input({ status: CouponStatusEnum.INACTIVE }))).rejects.toThrow(
      UnknownOperatorError,
    );
    expect(couponGateway.change).not.toHaveBeenCalled();
  });

  it('reports a coupon that vanished between the read and the write', async () => {
    couponRepository.change.mockResolvedValue(null);

    await expect(useCase.execute(input({ status: CouponStatusEnum.INACTIVE }))).rejects.toThrow(
      CouponNotFoundError,
    );
  });
});
