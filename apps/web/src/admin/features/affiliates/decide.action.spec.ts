import { revalidatePath } from 'next/cache';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { approveAffiliate, checkCouponAvailability, rejectAffiliate } from './decide.action';

jest.mock('@/shared/http/api-client', () => ({ authedApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const apiFetch = authedApiFetch as jest.MockedFunction<typeof authedApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const PUBLIC_ID = '10000000-0000-4000-8000-000000000001';
const COUPON = { couponCode: 'MARINA25', couponDiscountPercent: 10 };

beforeEach(() => {
  apiFetch.mockReset();
  revalidate.mockReset();
  apiFetch.mockResolvedValue(undefined);
});

describe('approveAffiliate', () => {
  it('posts the approval with the coupon to the admin channel', async () => {
    await approveAffiliate(PUBLIC_ID, COUPON);

    expect(apiFetch).toHaveBeenCalledWith(`/admin/affiliates/${PUBLIC_ID}/approve`, {
      method: 'POST',
      body: JSON.stringify(COUPON),
    });
  });

  it('uppercases the coupon code before sending it', async () => {
    await approveAffiliate(PUBLIC_ID, { couponCode: ' marina25 ', couponDiscountPercent: 10 });

    const [, init] = apiFetch.mock.calls[0];
    expect(JSON.parse(String(init?.body)).couponCode).toBe('MARINA25');
  });

  /* O formulário manda string; a API só aceita inteiro. */
  it('sends the discount as a number even when the form hands a string', async () => {
    await approveAffiliate(PUBLIC_ID, { couponCode: 'MARINA25', couponDiscountPercent: '10' });

    const [, init] = apiFetch.mock.calls[0];
    expect(JSON.parse(String(init?.body)).couponDiscountPercent).toBe(10);
  });

  it('refuses a coupon code shorter than the schema allows without calling the api', async () => {
    await approveAffiliate(PUBLIC_ID, { couponCode: 'MAR', couponDiscountPercent: 10 });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('explains why the discount was refused', async () => {
    await expect(
      approveAffiliate(PUBLIC_ID, { couponCode: 'MARINA25', couponDiscountPercent: 30 }),
    ).resolves.toEqual({ ok: false, message: 'O desconto vai até 25%' });
  });

  it('invalidates the queue so the decided registration leaves it', async () => {
    await approveAffiliate(PUBLIC_ID, COUPON);

    expect(revalidate).toHaveBeenCalledWith('/admin/afiliados');
  });

  it('invalidates the detail so the trail shows the new entry', async () => {
    await approveAffiliate(PUBLIC_ID, COUPON);

    expect(revalidate).toHaveBeenCalledWith(`/admin/afiliados/${PUBLIC_ID}`);
  });

  it('reports the api message when the registration was already decided', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, null, 'Este cadastro já foi decidido.'));

    await expect(approveAffiliate(PUBLIC_ID, COUPON)).resolves.toEqual({
      ok: false,
      message: 'Este cadastro já foi decidido.',
    });
  });

  it('does not invalidate anything when the decision failed', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, null, 'Já decidido.'));

    await approveAffiliate(PUBLIC_ID, COUPON);

    expect(revalidate).not.toHaveBeenCalled();
  });

  it('hides an unexpected failure behind a message the analyst can act on', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(approveAffiliate(PUBLIC_ID, COUPON)).resolves.toEqual({
      ok: false,
      message: 'Não foi possível registrar a decisão. Tente novamente.',
    });
  });
});

describe('checkCouponAvailability', () => {
  it('asks the admin channel about the code', async () => {
    apiFetch.mockResolvedValue({ code: 'MARINA25', available: true, reason: null });

    await checkCouponAvailability('MARINA25');

    expect(apiFetch).toHaveBeenCalledWith('/admin/coupons/availability?code=MARINA25');
  });

  it('carries the reason the api gave for a taken code', async () => {
    apiFetch.mockResolvedValue({
      code: 'MARINA25',
      available: false,
      reason: 'Cupom já existe',
    });

    await expect(checkCouponAvailability('MARINA25')).resolves.toEqual({
      available: false,
      reason: 'Cupom já existe',
    });
  });

  /*
    A checagem é uma conveniência do formulário: a autoridade é a aprovação, que
    responde 409. Um erro aqui não pode travar o botão de confirmar.
  */
  it('treats the code as available when the check itself fails', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(checkCouponAvailability('MARINA25')).resolves.toEqual({
      available: true,
      reason: null,
    });
  });

  it('does not ask the api about a code that breaks the format', async () => {
    await checkCouponAvailability('MAR');

    expect(apiFetch).not.toHaveBeenCalled();
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
