import { Text } from '@react-email/components';
import { MailButton, MailLayout, note, paragraph, quote } from './layout';

interface WithdrawalReturnedProps {
  name: string;
  amount: string;
  maskedPixKey: string;
  link: string;
}

/**
 * O banco de destino devolveu o PIX — em geral, chave encerrada ou de outra
 * pessoa. O que a pessoa precisa saber é que o dinheiro não se perdeu e o que
 * fazer para receber.
 */
export function WithdrawalReturned({ name, amount, maskedPixKey, link }: WithdrawalReturnedProps) {
  return (
    <MailLayout preview={`O PIX de ${amount} foi devolvido.`} heading={`Olá, ${name}`}>
      <Text style={paragraph}>O banco devolveu o PIX do seu saque, enviado para a chave:</Text>
      <Text style={quote}>{maskedPixKey}</Text>
      <Text style={paragraph}>
        O valor de {amount} voltou para o seu saldo. Confira sua chave PIX no perfil e peça o saque
        de novo pela carteira.
      </Text>
      <MailButton href={link}>Abrir a carteira</MailButton>
      <Text style={note}>A chave precisa ser sua, no seu CPF.</Text>
    </MailLayout>
  );
}
