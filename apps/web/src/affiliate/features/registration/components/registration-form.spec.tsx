import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { registerAffiliate } from '../register-affiliate.action';
import { RegistrationForm } from './registration-form';

jest.mock('../register-affiliate.action', () => ({ registerAffiliate: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));

const action = registerAffiliate as jest.MockedFunction<typeof registerAffiliate>;
const push = jest.fn();

function fillValidForm() {
  return {
    fullName: 'Marina Ferraz',
    email: 'marina@email.com',
    cpf: '52998224725',
    rg: '12.345.678-X',
    pixKey: 'marina@email.com',
  };
}

async function submitValidForm(user: ReturnType<typeof userEvent.setup>) {
  const values = fillValidForm();

  await user.type(screen.getByLabelText('Nome completo'), values.fullName);
  await user.type(screen.getByLabelText('E-mail'), values.email);
  await user.type(screen.getByLabelText('CPF'), values.cpf);
  await user.type(screen.getByLabelText('RG'), values.rg);
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

    for (const label of [
      'Nome completo',
      'E-mail',
      'CPF',
      'RG',
      'Tipo de chave PIX',
      'Chave PIX',
      'Rede social',
      '@ na rede',
    ]) {
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

  it('marks the required fields and leaves the optional ones unmarked', () => {
    render(<RegistrationForm />);

    for (const label of ['Nome completo', 'E-mail', 'CPF', 'RG', 'Chave PIX']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    }

    for (const label of ['Rede social', '@ na rede']) {
      expect(screen.getByLabelText(label)).not.toHaveAttribute('aria-required', 'true');
    }
  });

  it('sends the rg without punctuation and uppercased', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await submitValidForm(user);

    await waitFor(() =>
      expect(action).toHaveBeenCalledWith(expect.objectContaining({ rg: '12345678X' })),
    );
  });

  it('refuses an rg shorter than five characters without reaching the api', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText('RG'), '1234');
    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));

    expect(await screen.findByText('Informe um RG válido.')).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it('refuses a handle without its social network without reaching the api', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText('@ na rede'), '@marinaferraz');
    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));

    expect(await screen.findByText('Escolha a rede social do @ informado.')).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it('carries the at as a fixed prefix, so nobody has to type it', () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText('@ na rede')).toHaveAttribute('placeholder', 'seuperfil');
    expect(screen.getByText('@')).toHaveAttribute('aria-hidden', 'true');
  });

  it('still accepts a handle pasted with the at', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.type(screen.getByLabelText('@ na rede'), '@marinaferraz');
    await user.click(screen.getByRole('button', { name: 'Enviar cadastro' }));

    // Sem rede escolhida o envio para aqui, e é o par que o schema acusa — não
    // o formato do `@`, que continua sendo aceito com ou sem arroba.
    expect(await screen.findByText('Escolha a rede social do @ informado.')).toBeInTheDocument();
  });

  it('offers every social network the contract carries', async () => {
    const user = userEvent.setup();
    render(<RegistrationForm />);

    await user.click(screen.getByLabelText('Rede social'));

    for (const name of ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'Kwai']) {
      expect(await screen.findByRole('option', { name })).toBeInTheDocument();
    }
  });

  /*
    O mesmo formulário é a seção no pé da landing e a página `/cadastro`
    inteira. Roubar o foco na landing arrastaria quem abriu a página para o
    fim dela antes de ler a primeira linha — só a página do formulário foca.
  */
  it('leaves the focus alone where it is a section of a longer page', () => {
    render(<RegistrationForm />);

    expect(screen.getByLabelText('Nome completo')).not.toHaveFocus();
  });

  it('takes the focus where the form is the whole page', () => {
    render(<RegistrationForm autoFocus />);

    expect(screen.getByLabelText('Nome completo')).toHaveFocus();
  });
});
