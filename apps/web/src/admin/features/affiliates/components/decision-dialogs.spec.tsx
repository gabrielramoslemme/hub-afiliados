import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { approveAffiliate, checkCouponAvailability } from '../decide.action';
import { ApproveDialog, RejectDialog } from './decision-dialogs';

jest.mock('../decide.action', () => ({
  approveAffiliate: jest.fn(),
  checkCouponAvailability: jest.fn(),
  rejectAffiliate: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const approve = approveAffiliate as jest.MockedFunction<typeof approveAffiliate>;
const checkAvailability = checkCouponAvailability as jest.MockedFunction<
  typeof checkCouponAvailability
>;

const PUBLIC_ID = '10000000-0000-4000-8000-000000000001';

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ refresh: jest.fn() });
  approve.mockResolvedValue({ ok: true });
  checkAvailability.mockResolvedValue({ available: true, reason: null });
});

function renderApproveDialog() {
  return render(
    <ApproveDialog publicId={PUBLIC_ID} name="Marina Ferraz" open onOpenChange={jest.fn()} />,
  );
}

describe('ApproveDialog', () => {
  it('opens with the cursor already in the coupon code', async () => {
    renderApproveDialog();

    expect(await screen.findByLabelText('Código do cupom')).toHaveFocus();
  });

  it('sends the coupon the analyst typed', async () => {
    const user = userEvent.setup();
    renderApproveDialog();

    await user.type(await screen.findByLabelText('Código do cupom'), 'MARINA25');
    await user.clear(screen.getByLabelText('Percentual de desconto'));
    await user.type(screen.getByLabelText('Percentual de desconto'), '15');
    await user.click(screen.getByRole('button', { name: /confirmar aprovação/i }));

    await waitFor(() =>
      expect(approve).toHaveBeenCalledWith(PUBLIC_ID, {
        couponCode: 'MARINA25',
        couponDiscountPercent: 15,
      }),
    );
  });

  it('refuses to approve with a coupon code shorter than the schema allows', async () => {
    const user = userEvent.setup();
    renderApproveDialog();

    await user.type(await screen.findByLabelText('Código do cupom'), 'MAR');
    await user.click(screen.getByRole('button', { name: /confirmar aprovação/i }));

    await screen.findByText('O código deve ter ao menos 4 caracteres');
    expect(approve).not.toHaveBeenCalled();
  });

  /*
    O conflito aparece no campo enquanto ela digita, em vez de voltar como 409
    depois de confirmar.
  */
  it('warns in the field when the provider already has the code', async () => {
    const user = userEvent.setup();
    checkAvailability.mockResolvedValue({ available: false, reason: 'Cupom já existe' });
    renderApproveDialog();

    await user.type(await screen.findByLabelText('Código do cupom'), 'MARINA25');

    expect(await screen.findByText('Cupom já existe')).toBeInTheDocument();
  });

  it('holds back the approval while the code is taken', async () => {
    const user = userEvent.setup();
    checkAvailability.mockResolvedValue({ available: false, reason: 'Cupom já existe' });
    renderApproveDialog();

    await user.type(await screen.findByLabelText('Código do cupom'), 'MARINA25');
    await screen.findByText('Cupom já existe');
    await user.click(screen.getByRole('button', { name: /confirmar aprovação/i }));

    expect(approve).not.toHaveBeenCalled();
  });

  it('does not ask about a code that is still too short to be valid', async () => {
    const user = userEvent.setup();
    renderApproveDialog();

    await user.type(await screen.findByLabelText('Código do cupom'), 'MAR');

    await waitFor(() => expect(checkAvailability).not.toHaveBeenCalled());
  });
});

describe('RejectDialog', () => {
  it('opens with the cursor already in the reason', async () => {
    render(
      <RejectDialog publicId={PUBLIC_ID} name="Marina Ferraz" open onOpenChange={jest.fn()} />,
    );

    expect(await screen.findByLabelText('Motivo da reprovação')).toHaveFocus();
  });
});
