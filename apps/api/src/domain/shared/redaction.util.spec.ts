import { redactSensitive } from './redaction.util';

describe('redactSensitive', () => {
  it('removes every exact secret, whatever the case', () => {
    expect(redactSensitive('Chave PIX.Marina@email.com recusada', ['pix.marina@email.com'])).toBe(
      'Chave [removido] recusada',
    );
  });

  it('treats a secret as literal text, not as a pattern', () => {
    expect(redactSensitive('chave a+b@x.com e aab@x.com', ['a+b@x.com'])).toBe(
      'chave [removido] e aab@x.com',
    );
  });

  // O fornecedor devolve o CPF formatado mesmo quando mandamos só dígitos.
  it.each(['529.982.247-25', '52998224725'])('removes anything shaped like a cpf (%s)', (cpf) => {
    expect(redactSensitive(`Titular ${cpf} divergente`)).toBe('Titular [removido] divergente');
  });

  it('ignores empty secrets and keeps the rest of the text', () => {
    expect(redactSensitive('Conta encerrada', ['', null, undefined])).toBe('Conta encerrada');
  });
});
