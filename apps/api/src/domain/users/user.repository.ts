import { createToken } from '@Domain/shared/token';
import { UserEntity, UserWithAffiliate } from './user.entity';

export const USER_REPOSITORY = createToken<UserRepository>('USER_REPOSITORY');

export interface UserRepository {
  findByEmail(email: string): Promise<UserWithAffiliate | null>;
  findByPublicId(publicId: string): Promise<UserWithAffiliate | null>;
  findById(id: number): Promise<UserEntity | null>;
  save(user: Partial<UserEntity>): Promise<UserEntity>;
}
