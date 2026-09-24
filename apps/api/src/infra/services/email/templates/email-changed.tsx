import { Text } from '@react-email/components';
import { MailLayout, note, paragraph, quote } from './layout';

interface EmailChangedProps {
  name: string;
  newEmail: string;
}

/**
 * Vai para o endereço antigo. O novo aparece inteiro, sem máscara: é ele que o
 * dono precisa citar ao suporte se a troca não foi dele.
 */
export function EmailChanged({ name, newEmail }: EmailChangedProps) {
  return (
    <MailLayout preview="O e-mail da sua conta foi alterado." heading={`Olá, ${name}`}>
      <Text style={paragraph}>
        O e-mail da sua conta no Hub de Afiliados acabou de ser alterado. A partir de agora, você
        entra com o novo endereço, e é para ele que enviamos os avisos da conta:
      </Text>
      <Text style={quote}>{newEmail}</Text>
      <Text style={note}>
        Se não foi você quem fez a troca, escreva agora para afiliados@portoservico.com.br.
      </Text>
    </MailLayout>
  );
}
