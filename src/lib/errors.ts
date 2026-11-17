import type { T } from './i18n';

/** Turns server errors into a friendly message in the user's language. */
export function friendly(e: unknown, t: T): string {
  const m = String((e as { message?: string })?.message ?? e ?? '');
  if (m.includes('ABUSE_BLOCKED')) return t('error.abuse');
  if (m.includes('Daily limit')) return t('error.dailyLimit');
  if (m.includes('LINK_NOT_ALLOWED') || m.includes('requests_link_check')) return t('error.link');
  if (/row-level security/i.test(m)) return t('error.loginNeeded');
  if (/expired or is invalid|otp_expired|invalid.*(token|otp)/i.test(m)) return t('error.badCode');
  if (/network request failed|failed to fetch/i.test(m)) return t('error.network');
  return m;
}
