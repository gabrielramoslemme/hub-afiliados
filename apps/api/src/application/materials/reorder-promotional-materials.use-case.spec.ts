import { MaterialOrderOutdatedError } from '@Domain/materials/materials.errors';
import { promotionalMaterialRepositoryMock } from '@Testing/mocks/repositories/promotional-material.repository.mock';
import { ReorderPromotionalMaterialsUseCase } from './reorder-promotional-materials.use-case';

describe('ReorderPromotionalMaterialsUseCase', () => {
  const IDS = ['50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001'];

  it('writes every material in the order given', async () => {
    const promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    promotionalMaterialRepository.reorder.mockResolvedValue(true);

    await new ReorderPromotionalMaterialsUseCase(promotionalMaterialRepository).execute(IDS);

    expect(promotionalMaterialRepository.reorder).toHaveBeenCalledWith(IDS);
  });

  /* Alguém criou ou apagou um material enquanto a tela estava aberta: gravar a ordem velha perderia o dele. */
  it('refuses an order that no longer matches the materials that exist', async () => {
    const promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    promotionalMaterialRepository.reorder.mockResolvedValue(false);

    await expect(
      new ReorderPromotionalMaterialsUseCase(promotionalMaterialRepository).execute(IDS),
    ).rejects.toThrow(MaterialOrderOutdatedError);
  });
});
