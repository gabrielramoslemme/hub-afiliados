import { Lock } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  ChangeEmailDialog,
  ChangeOccupationDialog,
  ChangePixKeyDialog,
  PageHeading,
  type ProfileField,
  profileRows,
  RevealableValue,
} from '@/affiliate/features/area';
import { fetchAccount } from '@/affiliate/features/area/data';
import { site } from '@/affiliate/shared/content';
import { Badge } from '@/shared/components/ui/badge';
import { statusLabel, statusTone } from '@/shared/lib/affiliate-status';

export const metadata: Metadata = { title: 'Seu perfil' };

export default async function ProfilePage() {
  const account = await fetchAccount();

  const rows = profileRows(account);

  // E-mail, ocupação e chave são os dados que o próprio afiliado troca: os
  // demais passaram pela análise da Porto, e por isso só essas linhas têm ação.
  const actions: Partial<Record<ProfileField, ReactNode>> = {
    email: <ChangeEmailDialog email={account.email} />,
    occupation: <ChangeOccupationDialog occupation={account.occupation} />,
    pixKey: (
      <ChangePixKeyDialog pixKeyType={account.pixKeyType} maskedPixKey={account.maskedPixKey} />
    ),
  };

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
              key={row.field}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 py-4"
            >
              <dt className="text-[0.9375rem] text-ink-500">{row.label}</dt>
              <dd
                className="flex flex-wrap items-center gap-2 font-medium text-ink-900"
                data-tabular
              >
                {row.revealed ? (
                  <RevealableValue label={row.label} masked={row.value} revealed={row.revealed} />
                ) : (
                  row.value
                )}
                {actions[row.field]}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-500">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden />
          CPF, RG e chave PIX aparecem mascarados até você tocar no olho. O e-mail, a ocupação e a
          chave PIX você troca aqui mesmo; para corrigir qualquer outro dado, escreva para{' '}
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
