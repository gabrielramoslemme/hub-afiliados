import { Logger } from '@nestjs/common';
import { CouponStatusEnum } from '@porto/contracts';
import { CouponCodeUnavailableError } from '@Domain/coupons/coupons.errors';
import { FakeCouponGateway } from './fake-coupon.gateway';

/*
  Só o que faz o dublê se comportar como a Porto nos pontos em que o e2e confia:
  um código existe uma vez, e desativar não o devolve ao estoque.
*/
describe('FakeCouponGateway', () => {
  let gateway: FakeCouponGateway;
  let log: jest.SpyInstance;

  beforeEach(() => {
    gateway = new FakeCouponGateway();
    // O adapter anuncia o registro de propósito; aqui a saída do teste é que fica limpa.
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('refuses a code it already registered', async () => {
    await gateway.issue({ code: 'MARINA25', discountPercent: 10 });

    await expect(gateway.issue({ code: 'MARINA25', discountPercent: 15 })).rejects.toThrow(
      CouponCodeUnavailableError,
    );
  });

  it('keeps a deactivated code unavailable', async () => {
    await gateway.issue({ code: 'MARINA25', discountPercent: 10 });
    await gateway.change({ code: 'MARINA25', status: CouponStatusEnum.INACTIVE });

    await expect(gateway.checkAvailability('MARINA25')).resolves.toMatchObject({
      available: false,
    });
  });
});
