import type { Lang } from './i18n';

/**
 * Someone opening a shared arzi link for the first time skips the language screen:
 * they get the sharer's language (?lang= on the link), else Hindi if their phone is in Hindi, else Hinglish.
 * Returns null for any other page, where we still ask.
 */
export function langFromLink(pathname: string, search: string, phoneLang: string | undefined): Lang | null {
  if (!/\/request\/[^/]+\/?$/.test(pathname)) return null;
  const asked = new URLSearchParams(search).get('lang');
  if (asked === 'en' || asked === 'hi' || asked === 'hinglish') return asked;
  return (phoneLang ?? '').toLowerCase().startsWith('hi') ? 'hi' : 'hinglish';
}
