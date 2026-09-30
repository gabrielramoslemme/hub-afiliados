import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildTrainingModule } from '@Testing/factories/training-module.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { clockMock } from '@Testing/mocks/services/clock.mock';
import { CompleteTrainingModuleUseCase } from './complete-training-module.use-case';

describe('CompleteTrainingModuleUseCase', () => {
  const NOW = new Date('2026-09-30T13:00:00.000Z');

  let userRepository: ReturnType<typeof userRepositoryMock>;
  let trainingModuleRepository: ReturnType<typeof trainingModuleRepositoryMock>;
  let useCase: CompleteTrainingModuleUseCase;

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
    useCase = new CompleteTrainingModuleUseCase(
      userRepository,
      trainingModuleRepository,
      clockMock(NOW),
    );
  });

  it('records the module as watched by the affiliate who signed the token', async () => {
    await useCase.execute({ userPublicId: user.publicId, trainingModulePublicId: module.publicId });

    expect(trainingModuleRepository.markCompleted).toHaveBeenCalledWith(42, 9, NOW);
  });

  it('refuses a module that does not exist, recording nothing', async () => {
    trainingModuleRepository.findByPublicId.mockResolvedValue(null);

    await expect(
      useCase.execute({ userPublicId: user.publicId, trainingModulePublicId: module.publicId }),
    ).rejects.toThrow(TrainingModuleNotFoundError);
    expect(trainingModuleRepository.markCompleted).not.toHaveBeenCalled();
  });

  it('refuses a token whose user has no affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(
      useCase.execute({ userPublicId: user.publicId, trainingModulePublicId: module.publicId }),
    ).rejects.toThrow(UnknownAffiliateError);
    expect(trainingModuleRepository.markCompleted).not.toHaveBeenCalled();
  });
});
