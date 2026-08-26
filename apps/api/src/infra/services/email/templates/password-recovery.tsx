import { Text } from '@react-email/components';
import { MailButton, MailLayout, note, paragraph } from './layout';

interface PasswordRecoveryProps {
  name: string;
  link: string;
}

export function PasswordRecovery({ name, link }: PasswordRecoveryProps) {
  return (
    <MailLayout preview="Recebemos um pedido de recuperação de senha." heading={`Olá, ${name}`}>
      <Text style={paragraph}>
        Recebemos um pedido para redefinir a senha da sua conta no Hub de Afiliados. Use o botão
        abaixo para escolher uma nova.
      </Text>
      <MailButton href={link}>Redefinir minha senha</MailButton>
      <Text style={note}>
        O link é de uso único e expira em 2 horas. Se não foi você quem pediu, ignore este e-mail —
        sua senha atual continua valendo.
      </Text>
    </MailLayout>
  );
}
