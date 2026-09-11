import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './password-input';

describe('PasswordInput', () => {
  it('starts hidden, offering to show', () => {
    render(<PasswordInput aria-label="Senha" />);

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument();
  });

  it('reveals what was typed and flips the label', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);

    await user.type(screen.getByLabelText('Senha'), 'MudarAgora!2026');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('MudarAgora!2026');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
  });

  it('hides again on the second click', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('does not submit the form it lives in', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <form onSubmit={onSubmit}>
        <PasswordInput aria-label="Senha" />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the focus on the field after toggling', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Senha" />);

    await user.type(screen.getByLabelText('Senha'), 'segredo');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    // Quem digitou continua digitando: o olho não rouba o cursor do campo.
    expect(screen.getByLabelText('Senha')).toHaveFocus();
  });

  it('goes dead along with the field', () => {
    render(<PasswordInput aria-label="Senha" disabled />);

    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeDisabled();
  });
});
