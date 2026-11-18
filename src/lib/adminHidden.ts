import { api } from './api';
import type { FeedItem } from './types';

/** Admins: hidden arzi and arzi by banned people (open and closed), newest first. Kept out of the feed. */
export async function adminHiddenArzi(): Promise<{ items: FeedItem[]; banned: Set<string> }> {
  const [open, closed, ids] = await Promise.all([api.feed('open'), api.feed('closed'), api.adminBannedIds()]);
  const banned = new Set(ids);
  const items = [...open, ...closed]
    .filter((r) => r.hidden || banned.has(r.user_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { items, banned };
}
