import { revalidatePath } from 'next/cache';
import { CouponErrorCodeEnum, CouponStatusEnum } from '@porto/contracts';
import { authedApiFetch } from '@/shared/http/api-client';
import { ApiError } from '@/shared/http/api-error';
import { changeCoupon } from './change-coupon.action';

jest.mock('@/shared/http/api-client', () => ({ authedApiFetch: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const apiFetch = authedApiFetch as jest.MockedFunction<typeof authedApiFetch>;
const revalidate = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

const PUBLIC_ID = '10000000-0000-4000-8000-000000000001';

beforeEach(() => {
  apiFetch.mockReset();
  revalidate.mockReset();
  apiFetch.mockResolvedValue({ code: 'MARINA25', discountPercent: 10, status: 'INACTIVE' });
});

describe('changeCoupon', () => {
  it('sends only what changed to the admin channel', async () => {
    await changeCoupon(PUBLIC_ID, { status: CouponStatusEnum.INACTIVE });

    expect(apiFetch).toHaveBeenCalledWith(`/admin/affiliates/${PUBLIC_ID}/coupon`, {
      method: 'PATCH',
      body: JSON.stringify({ status: CouponStatusEnum.INACTIVE }),
    });
  });

  /* O formulário manda string; a API só aceita inteiro. */
  it('sends the discount as a number even when the form hands a string', async () => {
    await changeCoupon(PUBLIC_ID, { discountPercent: '15' });

    const [, init] = apiFetch.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ discountPercent: 15 });
  });

  it('refuses a change that carries nothing without calling the api', async () => {
    await expect(changeCoupon(PUBLIC_ID, {})).resolves.toEqual({
      ok: false,
      message: 'Altere o status ou o percentual de desconto.',
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('invalidates the detail so the coupon and the trail show the change', async () => {
    await changeCoupon(PUBLIC_ID, { status: CouponStatusEnum.INACTIVE });

    expect(revalidate).toHaveBeenCalledWith(`/admin/afiliados/${PUBLIC_ID}`);
  });

  it('reports the api message when the provider refuses the change', async () => {
    apiFetch.mockRejectedValue(
      new ApiError(
        409,
        CouponErrorCodeEnum.REFUSED,
        'A Porto Serviços recusou os dados do cupom. Revise o código e o percentual.',
      ),
    );

    await expect(changeCoupon(PUBLIC_ID, { discountPercent: 15 })).resolves.toEqual({
      ok: false,
      message: 'A Porto Serviços recusou os dados do cupom. Revise o código e o percentual.',
    });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('hides an unexpected failure behind a message the analyst can act on', async () => {
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(changeCoupon(PUBLIC_ID, { discountPercent: 15 })).resolves.toEqual({
      ok: false,
      message: 'Não foi possível alterar o cupom. Tente novamente.',
    });
  });
});
