import { IncentiveErrorCodeEnum, IncentiveStatusEnum } from '@porto/contracts';
import {
  IncentiveEventOutcomeEnum,
  IncentiveEventTypeEnum,
} from '@Domain/sales/incentive-event.entity';
import {
  InconsistentIncentiveEventError,
  SaleAlreadySettledError,
  SaleCouponMismatchError,
  SaleNotRegisteredError,
  UnknownSaleCouponError,
} from '@Domain/sales/sales.errors';
import { buildCoupon } from '@Testing/factories/coupon.factory';
import { buildSale } from '@Testing/factories/sale.factory';
import { couponRepositoryMock } from '@Testing/mocks/repositories/coupon.repository.mock';
import { incentiveEventRepositoryMock } from '@Testing/mocks/repositories/incentive-event.repository.mock';
import { saleRepositoryMock } from '@Testing/mocks/repositories/sale.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import {
  ApplyIncentiveEventInput,
  ApplyIncentiveEventUseCase,
} from './apply-incentive-event.use-case';

describe('ApplyIncentiveEventUseCase', () => {
  const NOW = new Date('2026-09-11T12:17:09.000Z');
  const SENT_AT = new Date('2026-09-11T12:17:08.319Z');
  const EXTERNAL_ID = '7c4f7b20-709a-4bde-8646-2fd1a5ae6fd4';

  let couponRepository: ReturnType<typeof couponRepositoryMock>;
  let saleRepository: ReturnType<typeof saleRepositoryMock>;
  let incentiveEventRepository: ReturnType<typeof incentiveEventRepositoryMock>;
  let useCase: ApplyIncentiveEventUseCase;

  const coupon = buildCoupon({ id: 7, code: 'PARCEIRO10' });

  const STATUS_BY_TYPE = {
    [IncentiveEventTypeEnum.SALE_REGISTERED]: IncentiveStatusEnum.PENDING,
    [IncentiveEventTypeEnum.SALE_COMPLETED]: IncentiveStatusEnum.RELEASED,
    [IncentiveEventTypeEnum.SALE_NOT_COMPLETED]: IncentiveStatusEnum.CANCELED,
  };

  function input(
    eventType: IncentiveEventTypeEnum,
    overrides: Partial<ApplyIncentiveEventInput> = {},
  ): ApplyIncentiveEventInput {
    return {
      eventId: '8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b',
      sentAt: SENT_AT,
      eventType,
      incentiveStatus: STATUS_BY_TYPE[eventType],
      externalSaleId: EXTERNAL_ID,
      couponCode: 'PARCEIRO10',
      amountCents: 31099,
      item: 'PFAZ * VENTILADOR',
      payload: { idEvento: '8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b' },
      ...overrides,
    };
  }

  function existingSale(incentiveStatus: IncentiveStatusEnum, couponId = coupon.id) {
    return buildSale({ id: 40, externalId: EXTERNAL_ID, couponId, incentiveStatus });
  }

  beforeEach(() => {
    couponRepository = couponRepositoryMock();
    saleRepository = saleRepositoryMock();
    incentiveEventRepository = incentiveEventRepositoryMock();

    couponRepository.findByCode.mockResolvedValue(coupon);
    saleRepository.register.mockImplementation(async (sale) =>
      buildSale({ ...sale, id: 40, externalId: sale.externalId }),
    );
    saleRepository.settle.mockImplementation(async (change) =>
      buildSale({ id: 40, incentiveStatus: change.toStatus, settledAt: change.settledAt }),
    );

    useCase = new ApplyIncentiveEventUseCase(
      couponRepository,
      saleRepository,
      incentiveEventRepository,
      clockMock(NOW),
    );
  });

  describe('registration', () => {
    it('creates the sale as pending, dated by when Porto sent it', async () => {
      const result = await useCase.execute(input(IncentiveEventTypeEnum.SALE_REGISTERED));

      expect(saleRepository.register).toHaveBeenCalledWith({
        couponId: 7,
        externalId: EXTERNAL_ID,
        amountCents: 31099,
        item: 'PFAZ * VENTILADOR',
        registeredAt: SENT_AT,
        event: {
          eventId: '8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b',
          externalSaleId: EXTERNAL_ID,
          eventType: IncentiveEventTypeEnum.SALE_REGISTERED,
          payload: { idEvento: '8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b' },
          sentAt: SENT_AT,
          receivedAt: NOW,
        },
      });
      expect(result.applied).toBe(true);
    });

    it('finds the coupon however the checkout cased it', async () => {
      await useCase.execute(
        input(IncentiveEventTypeEnum.SALE_REGISTERED, { couponCode: ' parceiro10 ' }),
      );

      expect(couponRepository.findByCode).toHaveBeenCalledWith('PARCEIRO10');
    });

    it('does not reopen a sale that was already settled', async () => {
      saleRepository.findByExternalId.mockResolvedValue(existingSale(IncentiveStatusEnum.RELEASED));

      const result = await useCase.execute(input(IncentiveEventTypeEnum.SALE_REGISTERED));

      expect(result.applied).toBe(false);
      expect(saleRepository.register).not.toHaveBeenCalled();
    });

    /* A leitura não segura nada: quem decide a corrida é o índice único. */
    it('treats a sale created by a concurrent call as a repeat', async () => {
      saleRepository.findByExternalId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingSale(IncentiveStatusEnum.PENDING));
      saleRepository.register.mockResolvedValue(null);

      const result = await useCase.execute(input(IncentiveEventTypeEnum.SALE_REGISTERED));

      expect(result.applied).toBe(false);
      expect(incentiveEventRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: IncentiveEventOutcomeEnum.DUPLICATE, saleId: 40 }),
      );
    });
  });

  describe('settlement', () => {
    it.each([
      [IncentiveEventTypeEnum.SALE_COMPLETED, IncentiveStatusEnum.RELEASED],
      [IncentiveEventTypeEnum.SALE_NOT_COMPLETED, IncentiveStatusEnum.CANCELED],
    ])('settles a pending sale on %s as %s', async (eventType, toStatus) => {
      saleRepository.findByExternalId.mockResolvedValue(existingSale(IncentiveStatusEnum.PENDING));

      const result = await useCase.execute(input(eventType));

      expect(saleRepository.settle).toHaveBeenCalledWith(
        expect.objectContaining({ saleId: 40, toStatus, settledAt: SENT_AT }),
      );
      expect(result.applied).toBe(true);
    });

    it('answers a repeated settlement without writing the sale again', async () => {
      saleRepository.findByExternalId.mockResolvedValue(existingSale(IncentiveStatusEnum.RELEASED));

      const result = await useCase.execute(input(IncentiveEventTypeEnum.SALE_COMPLETED));

      expect(result).toEqual({ applied: false, salePublicId: expect.any(String) });
      expect(saleRepository.settle).not.toHaveBeenCalled();
      expect(incentiveEventRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: IncentiveEventOutcomeEnum.DUPLICATE,
          rejectionCode: null,
          receivedAt: NOW,
        }),
      );
    });

    it.each([
      [IncentiveEventTypeEnum.SALE_COMPLETED, IncentiveStatusEnum.CANCELED],
      [IncentiveEventTypeEnum.SALE_NOT_COMPLETED, IncentiveStatusEnum.RELEASED],
    ])('refuses %s on a sale already %s', async (eventType, current) => {
      saleRepository.findByExternalId.mockResolvedValue(existingSale(current));

      await expect(useCase.execute(input(eventType))).rejects.toThrow(SaleAlreadySettledError);
      expect(saleRepository.settle).not.toHaveBeenCalled();
    });

    it('refuses the opposite outcome when a concurrent call settled the sale first', async () => {
      saleRepository.findByExternalId
        .mockResolvedValueOnce(existingSale(IncentiveStatusEnum.PENDING))
        .mockResolvedValueOnce(existingSale(IncentiveStatusEnum.CANCELED));
      saleRepository.settle.mockResolvedValue(null);

      await expect(useCase.execute(input(IncentiveEventTypeEnum.SALE_COMPLETED))).rejects.toThrow(
        SaleAlreadySettledError,
      );
    });

    /* Decisão da Mesa: fora de ordem é 409, e a Porto reprocessa o registro. */
    it('refuses to settle a sale that was never registered', async () => {
      await expect(useCase.execute(input(IncentiveEventTypeEnum.SALE_COMPLETED))).rejects.toThrow(
        SaleNotRegisteredError,
      );
      expect(saleRepository.register).not.toHaveBeenCalled();
    });
  });

  describe('refusals', () => {
    it('refuses an event type paired with the wrong incentive status', async () => {
      await expect(
        useCase.execute(
          input(IncentiveEventTypeEnum.SALE_COMPLETED, {
            incentiveStatus: IncentiveStatusEnum.CANCELED,
          }),
        ),
      ).rejects.toThrow(InconsistentIncentiveEventError);
      expect(saleRepository.register).not.toHaveBeenCalled();
      expect(saleRepository.settle).not.toHaveBeenCalled();
    });

    it('refuses a coupon that belongs to no affiliate', async () => {
      couponRepository.findByCode.mockResolvedValue(null);

      await expect(useCase.execute(input(IncentiveEventTypeEnum.SALE_REGISTERED))).rejects.toThrow(
        UnknownSaleCouponError,
      );
      expect(saleRepository.register).not.toHaveBeenCalled();
    });

    it('refuses a sale that arrives under another coupon', async () => {
      saleRepository.findByExternalId.mockResolvedValue(
        existingSale(IncentiveStatusEnum.PENDING, 99),
      );

      await expect(useCase.execute(input(IncentiveEventTypeEnum.SALE_COMPLETED))).rejects.toThrow(
        SaleCouponMismatchError,
      );
      expect(saleRepository.settle).not.toHaveBeenCalled();
    });

    /* A trilha é o que o suporte consulta: a recusa entra nela antes de subir. */
    it('records the refused call with its code and the sale it named', async () => {
      saleRepository.findByExternalId.mockResolvedValue(existingSale(IncentiveStatusEnum.CANCELED));

      await expect(useCase.execute(input(IncentiveEventTypeEnum.SALE_COMPLETED))).rejects.toThrow(
        SaleAlreadySettledError,
      );
      expect(incentiveEventRepository.record).toHaveBeenCalledWith({
        eventId: '8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b',
        saleId: 40,
        externalSaleId: EXTERNAL_ID,
        eventType: IncentiveEventTypeEnum.SALE_COMPLETED,
        outcome: IncentiveEventOutcomeEnum.REJECTED,
        rejectionCode: IncentiveErrorCodeEnum.SALE_ALREADY_SETTLED,
        payload: { idEvento: '8d4a9d5f-4f17-4ad8-bec7-16db8d0e2a4b' },
        sentAt: SENT_AT,
        receivedAt: NOW,
      });
    });

    it('records a refusal with no sale when the coupon is unknown', async () => {
      couponRepository.findByCode.mockResolvedValue(null);

      await expect(useCase.execute(input(IncentiveEventTypeEnum.SALE_REGISTERED))).rejects.toThrow(
        UnknownSaleCouponError,
      );
      expect(incentiveEventRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: null,
          rejectionCode: IncentiveErrorCodeEnum.UNKNOWN_COUPON,
        }),
      );
    });
  });
});
