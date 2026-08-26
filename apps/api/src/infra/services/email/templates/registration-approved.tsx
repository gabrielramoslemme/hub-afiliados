import { Text } from '@react-email/components';
import { MailButton, MailLayout, note, paragraph } from './layout';

interface RegistrationApprovedProps {
  name: string;
  link: string;
}

export function RegistrationApproved({ name, link }: RegistrationApprovedProps) {
  return (
    <MailLayout
      preview="Seu cadastro foi aprovado. Crie sua senha para começar."
      heading={`Boas-vindas, ${name}!`}
    >
      <Text style={paragraph}>
        Seu cadastro no Hub de Afiliados foi aprovado. Falta só criar uma senha para você entrar na
        sua conta e pegar o seu cupom exclusivo.
      </Text>
      <MailButton href={link}>Criar minha senha</MailButton>
      <Text style={note}>
        O link é de uso único e expira em 48 horas. Se ele vencer, peça a recuperação de senha pelo
        portal do afiliado.
      </Text>
    </MailLayout>
  );
}
