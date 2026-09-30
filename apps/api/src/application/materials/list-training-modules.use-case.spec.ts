import { buildTrainingModule } from '@Testing/factories/training-module.factory';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { ListTrainingModulesUseCase } from './list-training-modules.use-case';

describe('ListTrainingModulesUseCase', () => {
  it('never hands out the serial id', async () => {
    const trainingModuleRepository = trainingModuleRepositoryMock();
    trainingModuleRepository.list.mockResolvedValue([buildTrainingModule()]);

    const [module] = await new ListTrainingModulesUseCase(trainingModuleRepository).execute();

    expect(module).not.toHaveProperty('id');
  });
});
