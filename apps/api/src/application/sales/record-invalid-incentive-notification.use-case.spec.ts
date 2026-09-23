import { IncentiveErrorCodeEnum } from '@porto/contracts';
import { IncentiveEventOutcomeEnum } from '@Domain/sales/incentive-event.entity';
import { incentiveEventRepositoryMock } from '@Testing/mocks/repositories/incentive-event.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { RecordInvalidIncentiveNotificationUseCase } from './record-invalid-incentive-notification.use-case';

describe('RecordInvalidIncentiveNotificationUseCase', () => {
  const NOW = new Date('2026-09-11T12:17:09.000Z');

  let incentiveEventRepository: ReturnType<typeof incentiveEventRepositoryMock>;
  let useCase: RecordInvalidIncentiveNotificationUseCase;

  beforeEach(() => {
    incentiveEventRepository = incentiveEventRepositoryMock();
    useCase = new RecordInvalidIncentiveNotificationUseCase(
      incentiveEventRepository,
      clockMock(NOW),
    );
  });

  /*
    A Porto não reenvia sozinha: um corpo recusado é uma venda que só volta por
    reprocessamento manual, e a trilha é onde o suporte a procura.
  */
  it('records the refused call as rejected for an invalid payload, with the ids it carried', async () => {
    const payload = { idEvento: 'evt-1', venda: { id: 'sale-1', cupom: '' } };

    await useCase.execute({ eventId: 'evt-1', externalSaleId: 'sale-1', payload });

    expect(incentiveEventRepository.record).toHaveBeenCalledWith({
      eventId: 'evt-1',
      saleId: null,
      externalSaleId: 'sale-1',
      eventType: null,
      outcome: IncentiveEventOutcomeEnum.REJECTED,
      rejectionCode: IncentiveErrorCodeEnum.INVALID_PAYLOAD,
      payload,
      sentAt: null,
      receivedAt: NOW,
    });
  });
});
