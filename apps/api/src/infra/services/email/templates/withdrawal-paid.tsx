import { Text } from '@react-email/components';
import { MailButton, MailLayout, note, paragraph, quote } from './layout';

interface WithdrawalPaidProps {
  name: string;
  amount: string;
  maskedPixKey: string;
  link: string;
}

/** A chave sai mascarada pelo mesmo motivo do aviso de troca de chave. */
export function WithdrawalPaid({ name, amount, maskedPixKey, link }: WithdrawalPaidProps) {
  return (
    <MailLayout preview={`Seu saque de ${amount} caiu na sua chave PIX.`} heading={`Olá, ${name}`}>
      <Text style={paragraph}>
        O saque que você pediu no Hub de Afiliados foi pago na chave PIX:
      </Text>
      <Text style={quote}>{maskedPixKey}</Text>
      <Text style={paragraph}>
        Valor pago: {amount}. O comprovante está no extrato da sua carteira.
      </Text>
      <MailButton href={link}>Ver o extrato</MailButton>
      <Text style={note}>
        Se você não reconhece este saque, escreva agora para afiliados@portoservico.com.br.
      </Text>
    </MailLayout>
  );
}
