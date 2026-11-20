import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Feed nudges, one at a time:
 * - "Did you buy it?" for your arzi whose voting closed (asked once per arzi on this device).
 * - "Now post yours" after your 7th vote, if you haven't posted in the last 7 days. "Not now"
 *   hides it until 20 more votes.
 */
export const POST_NUDGE_AFTER = 7;
export const POST_NUDGE_AGAIN_AFTER = 20;
export const RECENT_POST_DAYS = 7;

export function shouldShowPostNudge(p: {
  votes: number;
  dismissedAt: number | null;
  posted: number;
  lastPostedAt: number | null;
  now?: number;
}): boolean {
  if (p.votes < POST_NUDGE_AFTER) return false;
  if (p.dismissedAt !== null && p.votes - p.dismissedAt < POST_NUDGE_AGAIN_AFTER) return false;
  const now = p.now ?? Date.now();
  if (p.posted > 0 && p.lastPostedAt !== null && now - p.lastPostedAt < RECENT_POST_DAYS * 864e5) return false;
  return true;
}

const K = { votes: 'rz.votesCast', dismissed: 'rz.postNudgeDismissedAt', asked: 'rz.decideAsked' };

const num = async (k: string) => {
  const v = await AsyncStorage.getItem(k).catch(() => null);
  return v === null ? null : Number(v) || 0;
};

export interface NudgeState {
  votes: number;
  dismissedAt: number | null;
  asked: string[];
}

export async function loadNudgeState(): Promise<NudgeState> {
  const [votes, dismissedAt, asked] = await Promise.all([
    num(K.votes),
    num(K.dismissed),
    AsyncStorage.getItem(K.asked).catch(() => null),
  ]);
  let list: string[] = [];
  try {
    list = asked ? JSON.parse(asked) : [];
  } catch {
    list = [];
  }
  return { votes: votes ?? 0, dismissedAt, asked: Array.isArray(list) ? list : [] };
}

/** A new vote (not a changed one). Returns the new count. */
export async function noteNewVote(): Promise<number> {
  const n = ((await num(K.votes)) ?? 0) + 1;
  await AsyncStorage.setItem(K.votes, String(n)).catch(() => {});
  return n;
}

export const dismissPostNudge = (votes: number) => AsyncStorage.setItem(K.dismissed, String(votes)).catch(() => {});

export async function markAsked(id: string): Promise<string[]> {
  const { asked } = await loadNudgeState();
  const next = [...new Set([...asked, id])].slice(-200);
  await AsyncStorage.setItem(K.asked, JSON.stringify(next)).catch(() => {});
  return next;
}
