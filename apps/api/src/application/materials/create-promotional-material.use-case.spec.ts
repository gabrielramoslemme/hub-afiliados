import { buildPromotionalMaterial } from '@Testing/factories/promotional-material.factory';
import { promotionalMaterialRepositoryMock } from '@Testing/mocks/repositories/promotional-material.repository.mock';
import { CreatePromotionalMaterialUseCase } from './create-promotional-material.use-case';

describe('CreatePromotionalMaterialUseCase', () => {
  it('never hands out the serial id of the material it created', async () => {
    const promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    const {
      id: _id,
      publicId: _publicId,
      createdAt: _c,
      updatedAt: _u,
      ...input
    } = buildPromotionalMaterial();
    promotionalMaterialRepository.create.mockResolvedValue(buildPromotionalMaterial(input));

    const material = await new CreatePromotionalMaterialUseCase(
      promotionalMaterialRepository,
    ).execute(input);

    expect(material).not.toHaveProperty('id');
  });
});
