import { Logger } from '@nestjs/common';
import { CouponStatusEnum } from '@porto/contracts';
import { CouponCodeUnavailableError, CouponNotFoundError } from '@Domain/coupons/coupons.errors';
import { FakeCouponGateway } from './fake-coupon.gateway';

describe('FakeCouponGateway', () => {
  let gateway: FakeCouponGateway;

  beforeEach(() => {
    gateway = new FakeCouponGateway();
    // O adapter anuncia o registro de propósito; aqui a saída do teste é que fica limpa.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers a coupon that was never registered before', async () => {
    await expect(gateway.issue({ code: 'MARINA25', discountPercent: 10 })).resolves.toBeUndefined();
  });

  it('refuses a code it already registered', async () => {
    await gateway.issue({ code: 'MARINA25', discountPercent: 10 });

    await expect(gateway.issue({ code: 'MARINA25', discountPercent: 15 })).rejects.toThrow(
      CouponCodeUnavailableError,
    );
  });

  it('reports an unknown code as available', async () => {
    await expect(gateway.checkAvailability('MARINA25')).resolves.toEqual({
      available: true,
      reason: null,
    });
  });

  it('reports a registered code as unavailable', async () => {
    await gateway.issue({ code: 'MARINA25', discountPercent: 10 });

    await expect(gateway.checkAvailability('MARINA25')).resolves.toEqual({
      available: false,
      reason: 'Este código já está em uso.',
    });
  });

  describe('change', () => {
    it('accepts a change to a coupon it registered', async () => {
      await gateway.issue({ code: 'MARINA25', discountPercent: 10 });

      await expect(
        gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE }),
      ).resolves.toBeUndefined();
    });

    it('refuses to change a code it never registered', async () => {
      await expect(
        gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE }),
      ).rejects.toThrow(CouponNotFoundError);
    });

    /* Desativar não devolve o código ao estoque: ele continua sendo daquele afiliado. */
    it('keeps a deactivated code unavailable', async () => {
      await gateway.issue({ code: 'MARINA25', discountPercent: 10 });
      await gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE });

      await expect(gateway.checkAvailability('MARINA25')).resolves.toMatchObject({
        available: false,
      });
    });
  });
});
