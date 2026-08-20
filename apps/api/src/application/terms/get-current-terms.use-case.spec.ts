import { TermsNotPublishedError } from '@Domain/terms/terms.errors';
import { TermsVersionEntity } from '@Domain/terms/terms-version.entity';
import { termsVersionRepositoryMock } from '@Testing/mocks/repositories/terms-version.repository.mock';
import { GetCurrentTermsUseCase } from './get-current-terms.use-case';

describe('GetCurrentTermsUseCase', () => {
  const currentTerms: TermsVersionEntity = {
    id: 1,
    version: '1.0-homolog',
    contentUrl: 'https://example.com/termos/1.0',
    publishedAt: new Date('2026-08-17T12:00:00Z'),
    isCurrent: true,
    createdAt: new Date('2026-08-17T12:00:00Z'),
  };

  it('returns the version, the content url and the publication date', async () => {
    const termsVersionRepository = termsVersionRepositoryMock();
    termsVersionRepository.findCurrent.mockResolvedValue(currentTerms);

    await expect(new GetCurrentTermsUseCase(termsVersionRepository).execute()).resolves.toEqual({
      version: '1.0-homolog',
      contentUrl: 'https://example.com/termos/1.0',
      publishedAt: new Date('2026-08-17T12:00:00Z'),
    });
  });

  it('leaves the internal serial id out of the output', async () => {
    const termsVersionRepository = termsVersionRepositoryMock();
    termsVersionRepository.findCurrent.mockResolvedValue(currentTerms);

    const output = await new GetCurrentTermsUseCase(termsVersionRepository).execute();

    expect(output).not.toHaveProperty('id');
  });

  it('throws TermsNotPublishedError when no version is current', async () => {
    const termsVersionRepository = termsVersionRepositoryMock();
    termsVersionRepository.findCurrent.mockResolvedValue(null);

    await expect(new GetCurrentTermsUseCase(termsVersionRepository).execute()).rejects.toThrow(
      TermsNotPublishedError,
    );
  });
});
