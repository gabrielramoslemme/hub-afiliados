import { MailService } from '@Infra/services/email/mail.service';

export const mailServiceMock = (): jest.Mocked<Pick<MailService, 'send'>> => ({
  send: jest.fn().mockResolvedValue(undefined),
});
