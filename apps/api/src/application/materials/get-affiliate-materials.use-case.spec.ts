import { UnknownAffiliateError } from '@Domain/auth/auth.errors';
import { buildAffiliate } from '@Testing/factories/affiliate.factory';
import { buildPromotionalMaterial } from '@Testing/factories/promotional-material.factory';
import { buildTrainingModule } from '@Testing/factories/training-module.factory';
import { buildUser } from '@Testing/factories/user.factory';
import { promotionalMaterialRepositoryMock } from '@Testing/mocks/repositories/promotional-material.repository.mock';
import { trainingModuleRepositoryMock } from '@Testing/mocks/repositories/training-module.repository.mock';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { GetAffiliateMaterialsUseCase } from './get-affiliate-materials.use-case';

describe('GetAffiliateMaterialsUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let trainingModuleRepository: ReturnType<typeof trainingModuleRepositoryMock>;
  let promotionalMaterialRepository: ReturnType<typeof promotionalMaterialRepositoryMock>;
  let useCase: GetAffiliateMaterialsUseCase;

  const user = buildUser();
  const affiliate = buildAffiliate({ id: 42, user });

  beforeEach(() => {
    userRepository = userRepositoryMock();
    trainingModuleRepository = trainingModuleRepositoryMock();
    promotionalMaterialRepository = promotionalMaterialRepositoryMock();
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate });
    useCase = new GetAffiliateMaterialsUseCase(
      userRepository,
      trainingModuleRepository,
      promotionalMaterialRepository,
    );
  });

  it('marks as completed only the modules this affiliate watched', async () => {
    const watched = buildTrainingModule({ id: 1 });
    const pending = buildTrainingModule({ id: 2 });
    trainingModuleRepository.list.mockResolvedValue([watched, pending]);
    trainingModuleRepository.listCompletedIds.mockResolvedValue([1]);

    const materials = await useCase.execute(user.publicId);

    expect(trainingModuleRepository.listCompletedIds).toHaveBeenCalledWith(42);
    expect(materials.trainingModules.map((module) => [module.publicId, module.completed])).toEqual([
      [watched.publicId, true],
      [pending.publicId, false],
    ]);
  });

  it('never hands out the serial id of a module or a material', async () => {
    trainingModuleRepository.list.mockResolvedValue([buildTrainingModule()]);
    promotionalMaterialRepository.list.mockResolvedValue([buildPromotionalMaterial()]);

    const materials = await useCase.execute(user.publicId);

    expect(materials.trainingModules[0]).not.toHaveProperty('id');
    expect(materials.promotionalMaterials[0]).not.toHaveProperty('id');
  });

  it('refuses a token whose user has no affiliate profile', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await expect(useCase.execute(user.publicId)).rejects.toThrow(UnknownAffiliateError);
  });
});
