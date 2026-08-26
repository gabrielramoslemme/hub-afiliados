import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { CSSProperties, ReactNode } from 'react';

// A paleta espelha os tokens de marca do painel (apps/web/src/app/globals.css).
// Cliente de e-mail não lê variável CSS, então aqui o valor vai literal.
const BRAND_BLUE = '#0046c0';
const BRAND_DEEP = '#081e44';
const BRAND_CYAN = '#00a1fc';
const INK = '#0b1220';
const MUTED = '#5b6478';

const body: CSSProperties = {
  backgroundColor: '#f4f6fb',
  margin: 0,
  padding: '24px 12px',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', Roboto, system-ui, sans-serif",
};

const container: CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
};

const header: CSSProperties = {
  padding: '0 0 16px',
};

const wordmark: CSSProperties = {
  margin: 0,
  fontSize: '22px',
  lineHeight: '28px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: BRAND_BLUE,
};

const wordmarkSuffix: CSSProperties = {
  margin: '2px 0 0',
  fontSize: '13px',
  lineHeight: '18px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: MUTED,
};

const card: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  borderTop: `4px solid ${BRAND_CYAN}`,
  padding: '32px 28px',
};

const headingStyle: CSSProperties = {
  margin: '0 0 16px',
  fontSize: '22px',
  lineHeight: '30px',
  fontWeight: 700,
  color: BRAND_DEEP,
};

export const paragraph: CSSProperties = {
  margin: '0 0 16px',
  fontSize: '16px',
  lineHeight: '26px',
  color: INK,
};

export const note: CSSProperties = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '22px',
  color: MUTED,
};

export const quote: CSSProperties = {
  margin: '0 0 16px',
  padding: '12px 16px',
  backgroundColor: '#f4f6fb',
  borderLeft: `3px solid ${BRAND_BLUE}`,
  borderRadius: '4px',
  fontSize: '15px',
  lineHeight: '24px',
  color: INK,
};

const ctaSection: CSSProperties = {
  padding: '8px 0 24px',
};

const button: CSSProperties = {
  backgroundColor: BRAND_BLUE,
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 600,
  padding: '14px 28px',
  textDecoration: 'none',
};

const rule: CSSProperties = {
  borderColor: '#dfe4ee',
  margin: '24px 0 16px',
};

const footer: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  lineHeight: '20px',
  color: MUTED,
};

interface MailLayoutProps {
  preview: string;
  heading: string;
  children: ReactNode;
}

export function MailLayout({ preview, heading, children }: MailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={wordmark}>Porto</Text>
            <Text style={wordmarkSuffix}>Hub de Afiliados</Text>
          </Section>
          <Section style={card}>
            <Heading style={headingStyle}>{heading}</Heading>
            {children}
          </Section>
          <Hr style={rule} />
          <Text style={footer}>
            Mensagem automática do Hub de Afiliados da Porto Serviços. Não responda a este e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

interface MailButtonProps {
  href: string;
  children: ReactNode;
}

export function MailButton({ href, children }: MailButtonProps) {
  return (
    <Section style={ctaSection}>
      <Button href={href} style={button}>
        {children}
      </Button>
    </Section>
  );
}
