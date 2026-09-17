import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { PixKeyTypeEnum } from '@porto/contracts';
import { changePixKey } from '../change-pix-key.action';
import { ChangePixKeyDialog } from './pix-key-dialog';

jest.mock('../change-pix-key.action', () => ({ changePixKey: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const change = changePixKey as jest.MockedFunction<typeof changePixKey>;

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ refresh: jest.fn() });
  change.mockResolvedValue({ status: 'success' });
});

async function openDialog() {
  const user = userEvent.setup();
  render(<ChangePixKeyDialog pixKeyType={PixKeyTypeEnum.EMAIL} maskedPixKey="ma***@email.com" />);

  await user.click(screen.getByRole('button', { name: /alterar chave pix/i }));

  return user;
}

describe('ChangePixKeyDialog', () => {
  it('sends the new key along with the password that confirms it', async () => {
    const user = await openDialog();

    await user.type(await screen.findByLabelText('Nova chave PIX'), 'nova@email.com');
    await user.type(screen.getByLabelText('Senha atual'), 'SenhaAtual!2026');
    await user.click(screen.getByRole('button', { name: /salvar nova chave/i }));

    await waitFor(() =>
      expect(change).toHaveBeenCalledWith({
        pixKeyType: PixKeyTypeEnum.EMAIL,
        pixKey: 'nova@email.com',
        currentPassword: 'SenhaAtual!2026',
      }),
    );
  });

  it('shows a refused password on the password field', async () => {
    change.mockResolvedValue({
      status: 'invalid',
      fieldErrors: { currentPassword: 'Senha incorreta. Confira e tente de novo.' },
    });
    const user = await openDialog();

    await user.type(await screen.findByLabelText('Nova chave PIX'), 'nova@email.com');
    await user.type(screen.getByLabelText('Senha atual'), 'SenhaErrada!2026');
    await user.click(screen.getByRole('button', { name: /salvar nova chave/i }));

    expect(await screen.findByText('Senha incorreta. Confira e tente de novo.')).toBeVisible();
  });
});
