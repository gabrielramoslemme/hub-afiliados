import { Section, Text } from '@react-email/components';
import { CSSProperties } from 'react';
import { MailButton, MailLayout, note, paragraph } from './layout';

interface RegistrationApprovedProps {
  name: string;
  link: string;
  coupon: string;
  discountPercent: string;
}

// Cliente de e-mail não lê variável CSS: os valores da marca vão literais, como
// no `layout.tsx`.
const couponCard: CSSProperties = {
  margin: '0 0 20px',
  padding: '18px 20px',
  backgroundColor: '#f4f6fb',
  border: '1px solid #d8def0',
  borderRadius: '12px',
  textAlign: 'center',
};

const couponLabel: CSSProperties = {
  margin: '0 0 6px',
  fontSize: '12px',
  lineHeight: '16px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#5b6478',
};

const couponCode: CSSProperties = {
  margin: 0,
  fontSize: '26px',
  lineHeight: '34px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#0046c0',
};

const couponDiscount: CSSProperties = {
  margin: '6px 0 0',
  fontSize: '14px',
  lineHeight: '20px',
  color: '#0b1220',
};

export function RegistrationApproved({
  name,
  link,
  coupon,
  discountPercent,
}: RegistrationApprovedProps) {
  return (
    <MailLayout
      preview={`Seu cadastro foi aprovado. Seu cupom é ${coupon}.`}
      heading={`Boas-vindas, ${name}!`}
    >
      <Text style={paragraph}>
        Seu cadastro no Hub de Afiliados foi aprovado e seu cupom exclusivo já está valendo.
      </Text>

      <Section style={couponCard}>
        <Text style={couponLabel}>Seu cupom</Text>
        <Text style={couponCode}>{coupon}</Text>
        <Text style={couponDiscount}>{discountPercent}% de desconto para quem usar</Text>
      </Section>

      <Text style={paragraph}>
        Falta só criar uma senha para você entrar na sua conta e acompanhar os seus resultados.
      </Text>
      <MailButton href={link}>Criar minha senha</MailButton>
      <Text style={note}>
        O link é de uso único e expira em 48 horas. Se ele vencer, peça a recuperação de senha pelo
        portal do afiliado.
      </Text>
    </MailLayout>
  );
}
