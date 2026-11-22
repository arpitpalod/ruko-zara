/**
 * Coming back from Google with an error in the address: what to do.
 * - 'switch': that Google account already belongs to another Ruko Zara account (linked before, or the same
 *   email): sign in to that account, as with an email that already has one.
 * - 'cancelled': they backed out on Google's screen: stay as they were, quietly.
 * - 'failed': anything else (for example Google's screens took over 5 minutes): stay as they were and
 *   show "didn't finish, try again". Never a new account in their place: that's how a guest lost their votes.
 */
export type GoogleOutcome = 'switch' | 'cancelled' | 'failed';

export function googleOutcome(q: URLSearchParams): GoogleOutcome | null {
  const error = q.get('error') ?? '';
  const code = q.get('error_code') ?? '';
  const text = q.get('error_description') ?? '';
  if (!error && !code) return null;
  if (error === 'access_denied') return 'cancelled';
  if (/expired/i.test(text)) return 'failed';
  if (['identity_already_exists', 'email_exists', 'user_already_exists'].includes(code)) return 'switch';
  if (/already (linked|exists|registered|in use)/i.test(text)) return 'switch';
  return 'failed';
}

/** Kept for the next screen (the page reloads on the way back). */
export const GOOGLE_FAILED = 'rz.googleFailed';
