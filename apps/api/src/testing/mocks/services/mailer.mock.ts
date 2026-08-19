import { Mailer } from '@Domain/notifications/mailer';

export const mailerMock = (): jest.Mocked<Mailer> => ({
  send: jest.fn().mockResolvedValue(undefined),
});
