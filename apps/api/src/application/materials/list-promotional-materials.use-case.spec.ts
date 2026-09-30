import { buildPromotionalMaterial } from '@Testing/factories/promotional-material.factory';
import { promotionalMaterialRepositoryMock } from '@Testing/mocks/repositories/promotional-material.repository.mock';
import { ListPromotionalMaterialsUseCase } from './list-promotional-materials.use-case';

describe('ListPromotionalMaterialsUseCase', () => {
  it('never hands out the serial id', async () => {
    const promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    promotionalMaterialRepository.list.mockResolvedValue([buildPromotionalMaterial()]);

    const [material] = await new ListPromotionalMaterialsUseCase(
      promotionalMaterialRepository,
    ).execute();

    expect(material).not.toHaveProperty('id');
  });
});
