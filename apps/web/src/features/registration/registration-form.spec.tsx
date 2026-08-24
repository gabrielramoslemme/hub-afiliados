import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { registerAffiliate } from './register-affiliate.action';
import { RegistrationForm } from './registration-form';

jest.mock('./register-affiliate.action', () => ({ registerAffiliate: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

const action = registerAffiliate as jest.MockedFunction<typeof registerAffiliate>;
const push = jest.fn();

function fillValidForm() {
  return {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '52998224725',
    pixKey: 'marina@email.com',
  };
}

async function submitValidForm(user: ReturnType<typeof userEvent.setup>) {
  const values = fillValidForm();

  await user.type(screen.getByLabelText('Nome completo'), values.fullName);
  await user.type(screen.getByLabelText('E-mail'), values.email);
  await user.type(screen.getByLabelText('CPF'), values.cpf);
  await user.type(screen.getByLabelText('Chave PIX'), values.pixKey);
  await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));
}

beforeEach(() => {
  action.mockReset();
  push.mockReset();
  action.mockResolvedValue({ status: 'success' });
  (useRouter as jest.Mock).mockReturnValue({ push });
});

describe('RegistrationForm', () => {
  it('asks for every field the api requires', () => {
    render(<RegistrationForm />);

    for (const label of ['Nome completo', 'E-mail', 'CPF', 'Tipo de chave PIX', 'Chave PIX']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('masks the cpf as the person types', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText('CPF'), '52998224725');

    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
  });

  it('refuses an incomplete name without reaching the api', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText('Nome completo'), 'Marina');
    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));

    expect(await screen.findByText('Informe o nome e o sobrenome.')).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it('shows the field error the api reported', async () => {
    action.mockResolvedValue({
      status: 'invalid',
      fieldErrors: { email: 'Este e-mail já está cadastrado.' },
    });
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await submitValidForm(user);

    expect(await screen.findByText('Este e-mail já está cadastrado.')).toBeInTheDocument();
  });

  it('shows a form level alert when the failure is not on a field', async () => {
    action.mockResolvedValue({ status: 'failed', message: 'A API não respondeu.' });
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await submitValidForm(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('A API não respondeu.');
  });

  it('takes the person to the confirmation page once the api accepts', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await submitValidForm(user);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/cadastro/sucesso'));
  });

  it('blocks a second submission while the first is still running', async () => {
    action.mockImplementation(() => new Promise(() => undefined));
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await submitValidForm(user);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled());
  });
});
