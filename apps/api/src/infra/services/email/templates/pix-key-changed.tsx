import { Text } from '@react-email/components';
import { PixKeyTypeEnum } from '@porto/contracts';
import { MailLayout, note, paragraph, quote } from './layout';

interface PixKeyChangedProps {
  name: string;
  pixKeyType: PixKeyTypeEnum;
  maskedPixKey: string;
}

const PIX_KEY_TYPE_NAMES: Record<PixKeyTypeEnum, string> = {
  [PixKeyTypeEnum.EMAIL]: 'e-mail',
  [PixKeyTypeEnum.PHONE]: 'telefone',
  [PixKeyTypeEnum.CPF]: 'CPF',
};

/**
 * A chave sai mascarada: o dono a reconhece, e quem ler o e-mail por cima do
 * ombro — ou numa caixa invadida — não leva o destino do pagamento.
 */
export function PixKeyChanged({ name, pixKeyType, maskedPixKey }: PixKeyChangedProps) {
  return (
    <MailLayout preview="A chave PIX da sua conta foi alterada." heading={`Olá, ${name}`}>
      <Text style={paragraph}>
        A chave PIX da sua conta no Hub de Afiliados acabou de ser alterada. Os próximos pagamentos
        vão para a nova chave, do tipo {PIX_KEY_TYPE_NAMES[pixKeyType]}:
      </Text>
      <Text style={quote}>{maskedPixKey}</Text>
      <Text style={note}>
        Se não foi você quem fez a troca, redefina sua senha em "Esqueci minha senha" e escreva
        agora para afiliados@portoservico.com.br.
      </Text>
    </MailLayout>
  );
}
