import { OccupationEnum } from '@porto/contracts';
import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { affiliateRepositoryMock } from '@Testing/mocks/repositories/affiliate.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { ChangeOccupationUseCase } from './change-occupation.use-case';

describe('ChangeOccupationUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let affiliateRepository: ReturnType<typeof affiliateRepositoryMock>;
  let useCase: ChangeOccupationUseCase;

  const user = buildUser();
  const affiliate = buildAffiliate({ user, occupation: OccupationEnum.INFLUENCER });

  beforeEach(() => {
    userRepository = userRepositoryMock();
    affiliateRepository = affiliateRepositoryMock();
    useCase = new ChangeOccupationUseCase(userRepository, affiliateRepository);

    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
  });

  it('stores the occupation on the affiliate behind the token, authored by its owner', async () => {
    await useCase.execute({
      userPublicId: user.publicId,
      occupation: OccupationEnum.CONTENT_CREATOR,
    });

    expect(affiliateRepository.updateWithAudit).toHaveBeenCalledWith({
      affiliateId: affiliate.id,
      changes: { occupation: OccupationEnum.CONTENT_CREATOR },
      actorUserId: user.id,
    });
  });

  it('refuses a user without an affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(
      useCase.execute({ userPublicId: user.publicId, occupation: OccupationEnum.INFLUENCER }),
    ).rejects.toThrow(UnknownAffiliateError);
    expect(affiliateRepository.updateWithAudit).not.toHaveBeenCalled();
  });
});
