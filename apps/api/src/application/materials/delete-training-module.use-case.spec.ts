import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { DeleteTrainingModuleUseCase } from './delete-training-module.use-case';

describe('DeleteTrainingModuleUseCase', () => {
  const PUBLIC_ID = '40000000-0000-4000-8000-000000000001';

  it('refuses a module that does not exist', async () => {
    const trainingModuleRepository = trainingModuleRepositoryMock();
    trainingModuleRepository.delete.mockResolvedValue(false);

    await expect(
      new DeleteTrainingModuleUseCase(trainingModuleRepository).execute(PUBLIC_ID),
    ).rejects.toThrow(TrainingModuleNotFoundError);
  });
});
