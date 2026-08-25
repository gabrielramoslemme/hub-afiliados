import { LinkBuilder } from '@Domain/notifications/link-builder';

export const linkBuilderMock = (): jest.Mocked<LinkBuilder> => ({
  setPasswordLink: jest
    .fn()
    .mockReturnValue('https://afiliados.porto.example/definir-senha?token=plain-token'),
});
