'use server';

import { redirect } from 'next/navigation';
import { destroySession } from '../session';

export async function signOut(): Promise<void> {
  await destroySession();

  redirect('/admin/login');
}
