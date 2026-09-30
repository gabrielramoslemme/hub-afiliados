import { buildTrainingModule } from '@Testing/factories/training-module.factory';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { CreateTrainingModuleUseCase } from './create-training-module.use-case';

describe('CreateTrainingModuleUseCase', () => {
  it('never hands out the serial id of the module it created', async () => {
    const trainingModuleRepository = trainingModuleRepositoryMock();
    const {
      id: _id,
      publicId: _publicId,
      createdAt: _c,
      updatedAt: _u,
      ...input
    } = buildTrainingModule();
    trainingModuleRepository.create.mockResolvedValue(buildTrainingModule(input));

    const module = await new CreateTrainingModuleUseCase(trainingModuleRepository).execute(input);

    expect(module).not.toHaveProperty('id');
  });
});
