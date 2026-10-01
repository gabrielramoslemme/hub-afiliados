import { UserRoleEnum } from '@porto/contracts';
import { UnknownOperatorError } from '@Domain/auth/auth.errors';
import { buildAdminUser, buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { GetOperatorUseCase } from './get-operator.use-case';

describe('GetOperatorUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let useCase: GetOperatorUseCase;

  beforeEach(() => {
    userRepository = userRepositoryMock();
    useCase = new GetOperatorUseCase(userRepository);
  });

  it('answers the operator behind the token', async () => {
    const operator = buildAdminUser({
      name: 'Analista Porto',
      email: 'analista@porto.example',
      role: UserRoleEnum.MESA_ADMIN,
      shouldChangePassword: true,
    });
    userRepository.findByPublicId.mockResolvedValue({ ...operator, affiliate: null });

    await expect(useCase.execute(operator.publicId)).resolves.toEqual({
      publicId: operator.publicId,
      name: 'Analista Porto',
      email: 'analista@porto.example',
      role: UserRoleEnum.MESA_ADMIN,
      shouldChangePassword: true,
    });
  });

  it('refuses a user that is not an operator', async () => {
    const affiliate = buildUser();
    userRepository.findByPublicId.mockResolvedValue({ ...affiliate, affiliate: null });

    await expect(useCase.execute(affiliate.publicId)).rejects.toThrow(UnknownOperatorError);
  });
});
