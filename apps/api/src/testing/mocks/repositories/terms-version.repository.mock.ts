import { TermsVersionRepository } from '@Domain/terms/terms-version.repository';

export const termsVersionRepositoryMock = (): jest.Mocked<TermsVersionRepository> => ({
  findCurrent: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null),
});
