import { PromotionalMaterialNotFoundError } from '@Domain/materials/materials.errors';
import { promotionalMaterialRepositoryMock } from '@Testing/mocks/repositories/promotional-material.repository.mock';
import { DeletePromotionalMaterialUseCase } from './delete-promotional-material.use-case';

describe('DeletePromotionalMaterialUseCase', () => {
  const PUBLIC_ID = '50000000-0000-4000-8000-000000000001';

  it('refuses a material that does not exist', async () => {
    const promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    promotionalMaterialRepository.delete.mockResolvedValue(false);

    await expect(
      new DeletePromotionalMaterialUseCase(promotionalMaterialRepository).execute(PUBLIC_ID),
    ).rejects.toThrow(PromotionalMaterialNotFoundError);
  });
});
