'use client';

import { AFFILIATE_FORGOT_PASSWORD_PATH } from '@/affiliate/shared/routes';
import { resetPassword } from '../actions/reset-password.action';
import { PasswordForm } from './password-form';

/** A senha que nasce do link de recuperação, que vale 2 horas e serve uma vez. */
export function ResetPasswordForm({ token }: { token: string }) {
  return (
    <PasswordForm
      token={token}
      action={resetPassword}
      submitLabel="Redefinir senha"
      pendingLabel="Salvando…"
      errorLink={{ href: AFFILIATE_FORGOT_PASSWORD_PATH, label: 'Pedir um link novo' }}
    />
  );
}
