import { UserRoleEnum, UserTypeEnum } from '@porto/contracts';
import { UserEntity } from '@Domain/users/user.entity';

let sequence = 0;

export function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  sequence += 1;
  return {
    id: sequence,
    publicId: `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
    name: `Usuário ${sequence}`,
    email: `usuario${sequence}@example.com`,
    password: null,
    passwordSetAt: null,
    shouldChangePassword: false,
    isActive: true,
    type: UserTypeEnum.AFFILIATE,
    role: null,
    lastLoginAt: null,
    createdAt: new Date('2026-08-17T12:00:00Z'),
    updatedAt: new Date('2026-08-17T12:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

export function buildAdminUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return buildUser({
    type: UserTypeEnum.ADMIN,
    role: UserRoleEnum.PORTO_ANALYST,
    password: '$2b$10$hashed',
    passwordSetAt: new Date('2026-08-17T12:00:00Z'),
    ...overrides,
  });
}
