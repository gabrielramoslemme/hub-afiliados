import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { setTrainingModuleCompletion } from './training-module-completion.action';

jest.mock('@/shared/http/api-client', () => ({ affiliateApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const apiFetch = affiliateApiFetch as jest.MockedFunction<typeof affiliateApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const MODULE_ID = '40000000-0000-4000-8000-000000000001';

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue(undefined);
});

describe('setTrainingModuleCompletion', () => {
  it.each([
    [true, 'PUT'],
    [false, 'DELETE'],
  ])(
    'with completed=%s sends %s on the affiliate channel and refreshes the materials tab',
    async (completed, method) => {
      await expect(setTrainingModuleCompletion(MODULE_ID, completed)).resolves.toEqual({
        ok: true,
      });

      expect(apiFetch).toHaveBeenCalledWith(
        `/affiliate/me/training-modules/${MODULE_ID}/completion`,
        { method },
      );
      expect(revalidate).toHaveBeenCalledWith('/minha-conta/materiais');
    },
  );

  /* O id entra no path: um valor montado à mão não pode virar outro caminho da API. */
  it('refuses an id that is not a uuid without calling the api', async () => {
    await expect(setTrainingModuleCompletion('../pix-key', true)).resolves.toEqual({
      ok: false,
      message: 'Módulo não encontrado. Atualize a página e tente de novo.',
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('sends a refused session to sign in again', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, null, 'Sessão inválida.'));

    await expect(setTrainingModuleCompletion(MODULE_ID, false)).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/minha-conta/sessao-expirada');
  });

  it('reports a module removed meanwhile in words the affiliate can act on', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, null, 'Módulo da trilha não encontrado.'));

    await expect(setTrainingModuleCompletion(MODULE_ID, false)).resolves.toEqual({
      ok: false,
      message: 'Módulo não encontrado. Atualize a página e tente de novo.',
    });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('hides an unexpected failure behind a message to try again', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(setTrainingModuleCompletion(MODULE_ID, false)).resolves.toEqual({
      ok: false,
      message: 'Não foi possível atualizar o módulo agora. Tente novamente em instantes.',
    });
  });
});
