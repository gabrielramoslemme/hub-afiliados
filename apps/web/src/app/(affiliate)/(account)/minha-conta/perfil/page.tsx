import { Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { ChangeEmailDialog, ChangePixKeyDialog, PageHeading } from '@/affiliate/features/area';
import { fetchAccount } from '@/affiliate/features/area/data';
import { site } from '@/affiliate/shared/content';
import { Badge } from '@/shared/components/ui/badge';
import { statusLabel, statusTone } from '@/shared/lib/affiliate-status';
import { formatDate, formatSocialProfile, pixKeyTypeName } from '@/shared/lib/format';

export const metadata: Metadata = { title: 'Seu perfil' };

export default async function ProfilePage() {
  const account = await fetchAccount();

  /*
    CPF, RG e chave PIX chegam mascarados da API e ficam mascarados na tela: esta
    página abre em cima de um balcão, dentro de um ônibus, com alguém ao lado.
    Quem precisa conferir o dado inteiro tem o próprio documento. O `@`, não: ele
    é público por natureza, e mascará-lo esconderia o que a pessoa divulga.
  */
  const social = formatSocialProfile(account.socialNetwork, account.socialHandle);
  const rows = [
    { label: 'Nome', value: account.name },
    {
      label: 'E-mail',
      value: account.email,
      // E-mail e chave são os dados que o próprio afiliado troca: os demais
      // passaram pela análise da Porto, e por isso só essas linhas têm ação.
      action: <ChangeEmailDialog email={account.email} />,
    },
    { label: 'CPF', value: account.maskedCpf },
    { label: 'RG', value: account.maskedRg },
    ...(social ? [{ label: 'Rede social', value: social }] : []),
    {
      label: 'Chave PIX',
      value: `${account.maskedPixKey} (${pixKeyTypeName(account.pixKeyType)})`,
      action: (
        <ChangePixKeyDialog pixKeyType={account.pixKeyType} maskedPixKey={account.maskedPixKey} />
      ),
    },
    { label: 'No programa desde', value: formatDate(account.createdAt) },
  ];

  return (
    <>
      <PageHeading title="Seu perfil" lead="Os dados que a Porto usa para pagar você." />

      <div className="mt-7 max-w-2xl">
        <div className="flex items-center justify-between gap-4 rounded-panel border border-ink-200 bg-white px-6 py-5">
          <div>
            <p className="text-[0.8125rem] text-ink-500">Situação do cadastro</p>
            <p className="mt-1 text-[0.9375rem] text-ink-700">
              Aprovado é o único estado em que o cupom funciona.
            </p>
          </div>
          <Badge tone={statusTone(account.status)}>{statusLabel(account.status)}</Badge>
        </div>

        <dl className="mt-4 divide-y divide-ink-200 overflow-hidden rounded-panel border border-ink-200 bg-white">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4"
            >
              <dt className="text-[0.9375rem] text-ink-500">{row.label}</dt>
              <dd
                className="flex flex-wrap items-center gap-2 font-medium text-ink-900"
                data-tabular
              >
                {row.value}
                {'action' in row && row.action}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-500">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden />
          CPF, RG e chave PIX aparecem mascarados aqui de propósito. O e-mail e a chave PIX você
          troca aqui mesmo; para corrigir qualquer outro dado, escreva para{' '}
          <a
            href={`mailto:${site.contactEmail}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {site.contactEmail}
          </a>
          .
        </p>
      </div>
    </>
  );
}
