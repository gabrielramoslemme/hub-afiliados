import { PromotionalMaterialRepository } from '@Domain/materials/promotional-material.repository';

export const promotionalMaterialRepositoryMock =
  (): jest.Mocked<PromotionalMaterialRepository> => ({
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(false),
  });
