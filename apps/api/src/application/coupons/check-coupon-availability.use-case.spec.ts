import { InvalidCouponCodeError } from '@Domain/coupons/coupons.errors';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { couponRepositoryMock } from '@Testing/mocks/repositories/coupon.repository.mock';
import { couponGatewayMock } from '@Testing/mocks/services/coupon-gateway.mock';
import { CheckCouponAvailabilityUseCase } from './check-coupon-availability.use-case';

describe('CheckCouponAvailabilityUseCase', () => {
  let couponRepository: ReturnType<typeof couponRepositoryMock>;
  let couponGateway: ReturnType<typeof couponGatewayMock>;
  let useCase: CheckCouponAvailabilityUseCase;

  beforeEach(() => {
    couponRepository = couponRepositoryMock();
    couponGateway = couponGatewayMock();
    useCase = new CheckCouponAvailabilityUseCase(couponRepository, couponGateway);
  });

  it('reports a free code as available', async () => {
    await expect(useCase.execute('MARINA25')).resolves.toEqual({
      code: 'MARINA25',
      available: true,
      reason: null,
    });
  });

  it('answers with the normalized code, not the one that was typed', async () => {
    await expect(useCase.execute('  marina25 ')).resolves.toMatchObject({ code: 'MARINA25' });
  });

  it('reports a code another affiliate already holds here', async () => {
    couponRepository.findByCode.mockResolvedValue(buildCoupon({ code: 'MARINA25' }));

    await expect(useCase.execute('MARINA25')).resolves.toEqual({
      code: 'MARINA25',
      available: false,
      reason: 'Este código já está em uso por outro afiliado.',
    });
  });

  /* Uma volta de rede a menos: o que já é nosso não precisa ser perguntado a eles. */
  it('does not ask the provider about a code that is taken here', async () => {
    couponRepository.findByCode.mockResolvedValue(buildCoupon({ code: 'MARINA25' }));

    await useCase.execute('MARINA25');

    expect(couponGateway.checkAvailability).not.toHaveBeenCalled();
  });

  it('reports a code the provider says is taken', async () => {
    couponGateway.checkAvailability.mockResolvedValue({
      available: false,
      reason: 'Cupom já existe',
    });

    await expect(useCase.execute('MARINA25')).resolves.toEqual({
      code: 'MARINA25',
      available: false,
      reason: 'Cupom já existe',
    });
  });

  it('refuses a code that breaks the format before reaching the provider', async () => {
    await expect(useCase.execute('MAR')).rejects.toThrow(InvalidCouponCodeError);
    expect(couponGateway.checkAvailability).not.toHaveBeenCalled();
  });
});
