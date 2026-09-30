import { TrainingModuleRepository } from '@Domain/materials/training-module.repository';

export const trainingModuleRepositoryMock = (): jest.Mocked<TrainingModuleRepository> => ({
  list: jest.fn().mockResolvedValue([]),
  findByPublicId: jest.fn().mockResolvedValue(null),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(false),
  listCompletedIds: jest.fn().mockResolvedValue([]),
  markCompleted: jest.fn().mockResolvedValue(undefined),
});
