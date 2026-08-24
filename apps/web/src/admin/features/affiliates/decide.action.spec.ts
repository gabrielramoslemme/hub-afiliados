import { revalidatePath } from 'next/cache';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { approveAffiliate, rejectAffiliate } from './decide.action';

jest.mock('@/shared/http/api-client', () => ({ authedApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const apiFetch = authedApiFetch as jest.MockedFunction<typeof authedApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const PUBLIC_ID = '10000000-0000-4000-8000-000000000001';

beforeEach(() => {
  apiFetch.mockReset();
  revalidate.mockReset();
  apiFetch.mockResolvedValue(undefined);
});

describe('approveAffiliate', () => {
  it('posts the approval to the admin channel', async () => {
    await approveAffiliate(PUBLIC_ID);

    expect(apiFetch).toHaveBeenCalledWith(`/admin/affiliates/${PUBLIC_ID}/approve`, {
      method: 'POST',
      body: undefined,
    });
  });

  it('invalidates the queue so the decided registration leaves it', async () => {
    await approveAffiliate(PUBLIC_ID);

    expect(revalidate).toHaveBeenCalledWith('/admin/afiliados');
  });

  it('invalidates the detail so the trail shows the new entry', async () => {
    await approveAffiliate(PUBLIC_ID);

    expect(revalidate).toHaveBeenCalledWith(`/admin/afiliados/${PUBLIC_ID}`);
  });

  it('reports the api message when the registration was already decided', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, null, 'Este cadastro já foi decidido.'));

    await expect(approveAffiliate(PUBLIC_ID)).resolves.toEqual({
      ok: false,
      message: 'Este cadastro já foi decidido.',
    });
  });

  it('does not invalidate anything when the decision failed', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, null, 'Já decidido.'));

    await approveAffiliate(PUBLIC_ID);

    expect(revalidate).not.toHaveBeenCalled();
  });

  it('hides an unexpected failure behind a message the analyst can act on', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(approveAffiliate(PUBLIC_ID)).resolves.toEqual({
      ok: false,
      message: 'Não foi possível registrar a decisão. Tente novamente.',
    });
  });
});

describe('rejectAffiliate', () => {
  it('refuses a reason shorter than the schema allows without calling the api', async () => {
    await rejectAffiliate(PUBLIC_ID, { reason: 'curto' });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('explains why the reason was refused', async () => {
    await expect(rejectAffiliate(PUBLIC_ID, { reason: 'curto' })).resolves.toEqual({
      ok: false,
      message: 'Descreva o motivo com ao menos 10 caracteres',
    });
  });

  it('sends the reason, which goes to the email and to the audit trail', async () => {
    const reason = 'Perfil fora do público-alvo do programa nesta etapa.';

    await rejectAffiliate(PUBLIC_ID, { reason });

    expect(apiFetch).toHaveBeenCalledWith(`/admin/affiliates/${PUBLIC_ID}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  });

  it('trims the reason before sending it', async () => {
    await rejectAffiliate(PUBLIC_ID, { reason: '   Documentação ilegível no envio.   ' });

    const [, init] = apiFetch.mock.calls[0];
    expect(JSON.parse(String(init?.body)).reason).toBe('Documentação ilegível no envio.');
  });
});
