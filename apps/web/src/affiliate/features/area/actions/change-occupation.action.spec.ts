import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { affiliateApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { changeOccupation } from './change-occupation.action';

jest.mock('@/shared/http/api-client', () => ({ affiliateApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const apiFetch = affiliateApiFetch as jest.MockedFunction<typeof affiliateApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue(undefined);
});

describe('changeOccupation', () => {
  it('sends the occupation chosen to the affiliate channel and refreshes the profile', async () => {
    await expect(changeOccupation({ occupation: 'CONTENT_CREATOR' })).resolves.toEqual({
      status: 'success',
    });

    expect(apiFetch).toHaveBeenCalledWith('/affiliate/me/occupation', {
      method: 'PATCH',
      body: JSON.stringify({ occupation: 'CONTENT_CREATOR' }),
    });
    expect(revalidate).toHaveBeenCalledWith('/minha-conta/perfil');
  });

  it('refuses an empty choice without calling the api', async () => {
    await expect(changeOccupation({ occupation: '' })).resolves.toEqual({
      status: 'invalid',
      fieldErrors: { occupation: 'Escolha sua ocupação.' },
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('sends a refused session to the login', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, null, 'Sessão expirada.'));

    await expect(changeOccupation({ occupation: 'INFLUENCER' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/minha-conta/sessao-expirada');
  });

  it('answers a failure the screen can show when the api refuses', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, null, 'Erro interno'));

    await expect(changeOccupation({ occupation: 'INFLUENCER' })).resolves.toEqual({
      status: 'failed',
      message: 'Erro interno',
    });
    expect(revalidate).not.toHaveBeenCalled();
  });
});
