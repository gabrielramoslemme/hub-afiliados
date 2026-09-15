import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { CouponStatusEnum } from '@porto/contracts';
import { changeCoupon } from '../change-coupon.action';
import { ChangeCouponDialog } from './coupon-dialog';

jest.mock('../change-coupon.action', () => ({ changeCoupon: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const change = changeCoupon as jest.MockedFunction<typeof changeCoupon>;

const PUBLIC_ID = '10000000-0000-4000-8000-000000000001';
const coupon = { code: 'MARINA25', discountPercent: 10, status: CouponStatusEnum.ACTIVE };

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ refresh: jest.fn() });
  change.mockResolvedValue({ ok: true });
});

function renderDialog() {
  return render(
    <ChangeCouponDialog publicId={PUBLIC_ID} coupon={coupon} open onOpenChange={jest.fn()} />,
  );
}

describe('ChangeCouponDialog', () => {
  it('opens showing the coupon as it is today', async () => {
    renderDialog();

    expect(await screen.findByLabelText('Ativo')).toBeChecked();
    expect(screen.getByLabelText('Percentual de desconto')).toHaveValue(10);
  });

  it('keeps the save button off until something changes', async () => {
    renderDialog();

    expect(await screen.findByRole('button', { name: /salvar alterações/i })).toBeDisabled();
  });

  /* O INT-01 trata campo ausente como "não mexe": reafirmar o que não mudou não é neutro. */
  it('sends only the status when only the status changed', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByLabelText('Inativo'));
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(change).toHaveBeenCalledWith(PUBLIC_ID, { status: CouponStatusEnum.INACTIVE }),
    );
  });

  it('sends only the discount when only the discount changed', async () => {
    const user = userEvent.setup();
    renderDialog();

    const discount = await screen.findByLabelText('Percentual de desconto');
    await user.clear(discount);
    await user.type(discount, '15');
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(change).toHaveBeenCalledWith(PUBLIC_ID, { discountPercent: 15 }));
  });

  it('warns that an inactive coupon stops working at checkout', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByLabelText('Inativo'));

    expect(screen.getByText(/deixa de valer no checkout/i)).toBeInTheDocument();
  });
});
