import type { T } from './i18n';

/** Turns server errors into a friendly message in the user's language. */
export function friendly(e: unknown, t: T): string {
  const m = String((e as { message?: string })?.message ?? e ?? '');
  if (m.includes('ABUSE_BLOCKED')) return t('error.abuse');
  if (m.includes('CONTACT_BLOCKED')) return t('error.contact');
  if (m.includes('Daily limit')) return t('error.dailyLimit');
  if (m.includes('GUEST_VOTE_LIMIT')) return t('error.guestLimit');
  if (m.includes('VOTE_TOO_FAST')) return t('error.tooFast');
  if (m.includes('CANNOT_BAN_ADMIN')) return t('error.cannotBanAdmin');
  if (/captcha/i.test(m)) return t('error.captcha');
  if (m.includes('LINK_NOT_ALLOWED') || m.includes('requests_link_check')) return t('error.link');
  if (/row-level security/i.test(m)) return t('error.loginNeeded');
  if (/expired or is invalid|otp_expired|invalid.*(token|otp)/i.test(m)) return t('error.badCode');
  if (/network request failed|failed to fetch/i.test(m)) return t('error.network');
  return m;
}

/** True when a guest has used up their free votes. */
export const isGuestLimit = (e: unknown) => String((e as { message?: string })?.message ?? e).includes('GUEST_VOTE_LIMIT');
