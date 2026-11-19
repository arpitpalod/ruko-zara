import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useUser } from './session';
import type { FeedItem } from './types';

/** Your own arzi, summed up for the savings header and the feed's nudges. */
export interface MineSummary {
  /** Price of your arzi marked "Didn't buy". */
  saved: number;
  posted: number;
  lastPostedAt: number | null;
  /** Voting has closed and you haven't said what you did. Newest first. */
  toDecide: FeedItem[];
}

export const summarize = (xs: FeedItem[], now = Date.now()): MineSummary => ({
  saved: xs.filter((x) => x.outcome === 'skipped').reduce((a, x) => a + x.price_inr, 0),
  posted: xs.length,
  lastPostedAt: xs.length ? Math.max(...xs.map((x) => new Date(x.created_at).getTime())) : null,
  toDecide: xs
    .filter((x) => !x.outcome && new Date(x.closes_at).getTime() <= now)
    .sort((a, b) => b.closes_at.localeCompare(a.closes_at)),
});

// Kept between screens so numbers never flash back to 0; one request at a time.
let last: MineSummary = { saved: 0, posted: 0, lastPostedAt: null, toDecide: [] };
let inFlight: Promise<MineSummary> | null = null;
const listeners = new Set<(m: MineSummary) => void>();

export function refreshMine(): Promise<MineSummary> {
  inFlight ??= api
    .mine()
    .then((xs) => {
      last = summarize(xs);
      listeners.forEach((f) => f(last));
      return last;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function useMine(): MineSummary {
  const user = useUser();
  const [m, setM] = useState(last);
  useEffect(() => {
    listeners.add(setM);
    return () => {
      listeners.delete(setM);
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (user.id) refreshMine().catch(() => {}); // not signed in yet: nothing of yours yet
    }, [user.id]),
  );
  return m;
}

export const useSavings = (): number => useMine().saved;
