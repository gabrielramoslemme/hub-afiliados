'use client';

import { AFFILIATE_FORGOT_PASSWORD_PATH } from '@/affiliate/shared/routes';
import { setPassword } from '../set-password.action';
import { PasswordForm } from './password-form';

/**
 * A senha que nasce do link da aprovação. O link vale 48 horas, e quem deixou
 * vencer não precisa mais escrever para o suporte: o erro leva para o pedido de
 * um link novo.
 */
export function SetPasswordForm({ token }: { token: string }) {
  return (
    <PasswordForm
      token={token}
      action={setPassword}
      submitLabel="Criar senha e entrar"
      pendingLabel="Criando…"
      errorLink={{ href: AFFILIATE_FORGOT_PASSWORD_PATH, label: 'Pedir um link novo' }}
    />
  );
}
