import { TrainingModuleNotFoundError } from '@Domain/materials/materials.errors';
import { buildTrainingModule } from '@Testing/factories/training-module.factory';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { UpdateTrainingModuleUseCase } from './update-training-module.use-case';

describe('UpdateTrainingModuleUseCase', () => {
  const { id: _id, publicId, createdAt: _c, updatedAt: _u, ...input } = buildTrainingModule();

  it('refuses a module that does not exist', async () => {
    const trainingModuleRepository = trainingModuleRepositoryMock();
    trainingModuleRepository.update.mockResolvedValue(null);

    await expect(
      new UpdateTrainingModuleUseCase(trainingModuleRepository).execute({ publicId, ...input }),
    ).rejects.toThrow(TrainingModuleNotFoundError);
  });

  it('never hands out the serial id of the module it changed', async () => {
    const trainingModuleRepository = trainingModuleRepositoryMock();
    trainingModuleRepository.update.mockResolvedValue(buildTrainingModule({ publicId, ...input }));

    const module = await new UpdateTrainingModuleUseCase(trainingModuleRepository).execute({
      publicId,
      ...input,
    });

    expect(module).not.toHaveProperty('id');
  });
});
