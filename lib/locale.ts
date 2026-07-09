'use server';

import { cookies } from 'next/headers';

/**
 * Set the locale preference cookie that next-intl reads in i18n/request.ts.
 * Called when the user changes language in settings.
 */
export async function setLocaleCookie(locale: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: 'lax',
  });
}
