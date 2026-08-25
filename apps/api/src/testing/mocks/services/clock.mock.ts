import { Clock } from '@Domain/shared/clock';

/** Instante fixo: o teste afirma a data que a regra gravou, não a de hoje. */
export const clockMock = (now = new Date('2026-08-25T12:00:00.000Z')): jest.Mocked<Clock> => ({
  now: jest.fn().mockReturnValue(now),
});
