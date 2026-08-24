import type { Metadata } from 'next';
import { RegistrationSection } from '@/features/registration/registration-section';

export const metadata: Metadata = {
  title: 'Cadastro do afiliado',
  description:
    'Preencha nome, e-mail, CPF e a chave PIX em que você quer receber. O cadastro é gratuito e leva menos de dois minutos.',
};

/** Mesma seção da landing, servindo link direto — a tela mora na feature. */
export default function RegistrationPage() {
  return <RegistrationSection />;
}
