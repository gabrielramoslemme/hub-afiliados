import { Text } from '@react-email/components';
import { MailLayout, note, paragraph } from './layout';

interface RegistrationReceivedProps {
  name: string;
}

export function RegistrationReceived({ name }: RegistrationReceivedProps) {
  return (
    <MailLayout
      preview="Recebemos seu cadastro e ele já está em análise."
      heading={`Recebemos seu cadastro, ${name}!`}
    >
      <Text style={paragraph}>
        Seu pedido para divulgar os serviços da Porto como afiliado chegou até nós e já está em
        análise pela nossa equipe.
      </Text>
      <Text style={paragraph}>
        Assim que a análise terminar, avisamos o resultado neste mesmo endereço. Você não precisa
        fazer nada agora.
      </Text>
      <Text style={note}>Guarde este e-mail para acompanhar o seu pedido.</Text>
    </MailLayout>
  );
}
