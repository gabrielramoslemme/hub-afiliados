import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildTrainingModule } from '@Testing/factories/training-module.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { UncompleteTrainingModuleUseCase } from './uncomplete-training-module.use-case';

describe('UncompleteTrainingModuleUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let trainingModuleRepository: ReturnType<typeof trainingModuleRepositoryMock>;
  let useCase: UncompleteTrainingModuleUseCase;

  const user = buildUser();
  const module = buildTrainingModule({ id: 9 });

  beforeEach(() => {
    userRepository = userRepositoryMock();
    trainingModuleRepository = trainingModuleRepositoryMock();
    userRepository.findByPublicId.mockResolvedValue({
      ...user,
      affiliate: buildAffiliate({ id: 42, user }),
    });
    trainingModuleRepository.findByPublicId.mockResolvedValue(module);
    useCase = new UncompleteTrainingModuleUseCase(userRepository, trainingModuleRepository);
  });

  it('clears the mark of the affiliate who signed the token only', async () => {
    await useCase.execute({ userPublicId: user.publicId, trainingModulePublicId: module.publicId });

    expect(trainingModuleRepository.unmarkCompleted).toHaveBeenCalledWith(42, 9);
  });

  it('refuses a module that does not exist, clearing nothing', async () => {
    trainingModuleRepository.findByPublicId.mockResolvedValue(null);

    await expect(
      useCase.execute({ userPublicId: user.publicId, trainingModulePublicId: module.publicId }),
    ).rejects.toThrow(TrainingModuleNotFoundError);
    expect(trainingModuleRepository.unmarkCompleted).not.toHaveBeenCalled();
  });

  it('refuses a token whose user has no affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(
      useCase.execute({ userPublicId: user.publicId, trainingModulePublicId: module.publicId }),
    ).rejects.toThrow(UnknownAffiliateError);
    expect(trainingModuleRepository.unmarkCompleted).not.toHaveBeenCalled();
  });
});
