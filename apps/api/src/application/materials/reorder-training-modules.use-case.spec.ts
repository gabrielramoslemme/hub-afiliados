import { MaterialOrderOutdatedError } from '@Domain/materials/materials.errors';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { ReorderTrainingModulesUseCase } from './reorder-training-modules.use-case';

describe('ReorderTrainingModulesUseCase', () => {
  const IDS = ['40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001'];

  it('writes the whole track in the order given', async () => {
    const trainingModuleRepository = trainingModuleRepositoryMock();
    trainingModuleRepository.reorder.mockResolvedValue(true);

    await new ReorderTrainingModulesUseCase(trainingModuleRepository).execute(IDS);

    expect(trainingModuleRepository.reorder).toHaveBeenCalledWith(IDS);
  });

  /* Alguém criou ou apagou um módulo enquanto a tela estava aberta: gravar a ordem velha perderia o dele. */
  it('refuses an order that no longer matches the modules that exist', async () => {
    const trainingModuleRepository = trainingModuleRepositoryMock();
    trainingModuleRepository.reorder.mockResolvedValue(false);

    await expect(
      new ReorderTrainingModulesUseCase(trainingModuleRepository).execute(IDS),
    ).rejects.toThrow(MaterialOrderOutdatedError);
  });
});
