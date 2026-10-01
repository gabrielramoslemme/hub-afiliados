import { ValidateBy, ValidationOptions } from 'class-validator';
import { passwordPolicyIssue } from '@porto/contracts';

/**
 * A política de senha de `@porto/contracts`, a mesma lista que a tela confere.
 * A mensagem é a da primeira regra descumprida, para a resposta dizer o que
 * falta e não só que a senha foi recusada.
 */
export function IsPasswordPolicy(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPasswordPolicy',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && passwordPolicyIssue(value) === null,
        defaultMessage: (args) =>
          typeof args?.value === 'string'
            ? (passwordPolicyIssue(args.value) ?? 'Senha inválida.')
            : 'Informe a senha.',
      },
    },
    options,
  );
}
