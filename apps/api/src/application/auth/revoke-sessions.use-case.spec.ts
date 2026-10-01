import { buildUser } from '@Testing/factories/user.factory';
import { userRepositoryMock } from '@Testing/mocks/repositories/user.repository.mock';
import { RevokeSessionsUseCase } from './revoke-sessions.use-case';

describe('RevokeSessionsUseCase', () => {
  let userRepository: ReturnType<typeof userRepositoryMock>;
  let useCase: RevokeSessionsUseCase;

  const user = buildUser();

  beforeEach(() => {
    userRepository = userRepositoryMock();
    useCase = new RevokeSessionsUseCase(userRepository);
  });

  it('revokes every session of the person behind the token', async () => {
    userRepository.findByPublicId.mockResolvedValue({ ...user, affiliate: null });

    await useCase.execute(user.publicId);

    expect(userRepository.revokeSessions).toHaveBeenCalledWith(user.id);
  });

  // Sair de uma conta que sumiu não é erro: não há sessão a manter.
  it('does nothing for a user that is gone', async () => {
    await expect(useCase.execute(user.publicId)).resolves.toBeUndefined();
    expect(userRepository.revokeSessions).not.toHaveBeenCalled();
  });
});
