'use server';

import { redirect } from 'next/navigation';
import { AFFILIATE_LOGIN_PATH } from '@/affiliate/shared/routes';
import { destroySession } from '../session';

export async function signOut(): Promise<never> {
  await destroySession();

  redirect(AFFILIATE_LOGIN_PATH);
}
