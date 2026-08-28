import { render, screen } from '@testing-library/react';
import { Field, fieldAria } from './field';

describe('Field', () => {
  it('marks a required field with an asterisk the screen reader does not announce', () => {
    render(
      <Field id="fullName" label="Nome completo" required>
        <input {...fieldAria('fullName', { required: true })} />
      </Field>,
    );

    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    // O asterisco é decoração: quem não enxerga a tela recebe a obrigatoriedade
    // pelo `aria-required`, e o rótulo continua sendo só o nome do campo.
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute('aria-required', 'true');
  });

  it('leaves an optional field without the asterisk', () => {
    render(
      <Field id="socialHandle" label="@ na rede">
        <input {...fieldAria('socialHandle', {})} />
      </Field>,
    );

    expect(screen.queryByText('*')).not.toBeInTheDocument();
    expect(screen.getByLabelText('@ na rede')).not.toHaveAttribute('aria-required');
  });

  it('describes the control by the error when there is one', () => {
    render(
      <Field id="cpf" label="CPF" required error="Informe um CPF válido.">
        <input {...fieldAria('cpf', { error: 'Informe um CPF válido.', required: true })} />
      </Field>,
    );

    expect(screen.getByLabelText('CPF')).toHaveAccessibleDescription('Informe um CPF válido.');
  });
});
