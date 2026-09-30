import { PromotionalMaterialNotFoundError } from '@Domain/materials/materials.errors';
import { buildPromotionalMaterial } from '@Testing/factories/promotional-material.factory';
import { promotionalMaterialRepositoryMock } from '@Testing/mocks/repositories/promotional-material.repository.mock';
import { UpdatePromotionalMaterialUseCase } from './update-promotional-material.use-case';

describe('UpdatePromotionalMaterialUseCase', () => {
  const { id: _id, publicId, createdAt: _c, updatedAt: _u, ...input } = buildPromotionalMaterial();

  it('refuses a material that does not exist', async () => {
    const promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    promotionalMaterialRepository.update.mockResolvedValue(null);

    await expect(
      new UpdatePromotionalMaterialUseCase(promotionalMaterialRepository).execute({
        publicId,
        ...input,
      }),
    ).rejects.toThrow(PromotionalMaterialNotFoundError);
  });

  it('never hands out the serial id of the material it changed', async () => {
    const promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    promotionalMaterialRepository.update.mockResolvedValue(
      buildPromotionalMaterial({ publicId, ...input }),
    );

    const material = await new UpdatePromotionalMaterialUseCase(
      promotionalMaterialRepository,
    ).execute({
      publicId,
      ...input,
    });

    expect(material).not.toHaveProperty('id');
  });
});
