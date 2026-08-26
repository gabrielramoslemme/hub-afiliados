import { Text } from '@react-email/components';
import { MailLayout, note, paragraph, quote } from './layout';

interface RegistrationRejectedProps {
  name: string;
  reason: string;
}

export function RegistrationRejected({ name, reason }: RegistrationRejectedProps) {
  return (
    <MailLayout
      preview="Sobre a análise do seu cadastro no Hub de Afiliados."
      heading={`Olá, ${name}`}
    >
      <Text style={paragraph}>
        Analisamos o seu cadastro no Hub de Afiliados e, desta vez, não foi possível aprová-lo.
      </Text>
      <Text style={quote}>{reason}</Text>
      <Text style={note}>
        Se você acredita que houve um engano ou quiser corrigir os dados, é possível fazer um novo
        cadastro.
      </Text>
    </MailLayout>
  );
}
