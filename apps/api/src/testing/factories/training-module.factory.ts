import { TrainingModuleEntity } from '@Domain/materials/training-module.entity';

let sequence = 0;

export function buildTrainingModule(
  overrides: Partial<TrainingModuleEntity> = {},
): TrainingModuleEntity {
  sequence += 1;
  return {
    id: sequence,
    publicId: `40000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    title: `Módulo ${sequence} - Porto Serviço`,
    description: 'Quem somos nós? O que nós proporcionamos?',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    durationMinutes: 5,
    position: sequence,
    createdAt: new Date('2026-09-29T12:00:00Z'),
    updatedAt: new Date('2026-09-29T12:00:00Z'),
    ...overrides,
  };
}
