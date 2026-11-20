import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Categories the person cares about; their feed shows these first. Remembered on this device. */
const KEY = 'ruko-zara.interests';
/** 'user' once the person picks or clears chips themselves; 'auto' while we pick for them from their votes. */
const MODE = 'ruko-zara.interests.mode';
/** '1' once the person has seen the "What do you shop for?" screen (picked or skipped). */
const ASKED = 'ruko-zara.interests.asked';

type Mode = 'user' | 'auto' | null;
type Voted = { category: string; my_vote?: unknown };

/** From 3 votes on: the categories that make up at least 30% of them, most-voted first, at most 2. */
export function learnInterests(items: Voted[]): string[] {
  const voted = items.filter((i) => i.my_vote);
  if (voted.length < 3) return [];
  const counts = new Map<string, number>();
  for (const i of voted) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n / voted.length >= 0.3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => c);
}

export function useInterests() {
  const [picked, setPicked] = useState<string[]>([]);
  const [auto, setAuto] = useState(false);
  const [asked, setAsked] = useState<boolean | undefined>(undefined); // undefined until read
  const mode = useRef<Mode | undefined>(undefined); // undefined until read from the device
  const waiting = useRef<Voted[] | null>(null);

  const save = useCallback((next: string[], how: 'user' | 'auto') => {
    setPicked(next);
    setAuto(how === 'auto');
    mode.current = how;
    AsyncStorage.multiSet([[KEY, JSON.stringify(next)], [MODE, how]]).catch(() => {});
  }, []);

  // Until the person chooses, keep the picks in step with what they vote on.
  const learnNow = useCallback(
    (items: Voted[]) => {
      if (mode.current === 'user') return;
      const next = learnInterests(items);
      if (next.length) save(next, 'auto');
    },
    [save],
  );

  useEffect(() => {
    AsyncStorage.multiGet([KEY, MODE, ASKED])
      .then(([[, v], [, m], [, a]]) => {
        const parsed = v ? JSON.parse(v) : [];
        const list = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
        setPicked(list);
        // Picks made before this change count as the person's own choice.
        mode.current = m === 'user' || m === 'auto' ? m : list.length ? 'user' : null;
        setAuto(mode.current === 'auto');
        setAsked(a === '1' || mode.current === 'user');
        if (waiting.current) learnNow(waiting.current);
      })
      .catch(() => {
        mode.current = 'user'; // storage unreadable: leave the feed alone
        setAsked(true);
      });
  }, [learnNow]);

  /** Call with the feed as loaded (not after each vote, so cards don't jump while someone is voting). */
  const learn = useCallback(
    (items: Voted[]) => {
      if (mode.current === undefined) waiting.current = items;
      else learnNow(items);
    },
    [learnNow],
  );

  const toggle = useCallback(
    (c: string) => save(picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c], 'user'),
    [picked, save],
  );

  /** The first-visit screen: their picks become their own choice; skipping leaves it to their votes. */
  const finishIntro = useCallback(
    (picks: string[]) => {
      setAsked(true);
      AsyncStorage.setItem(ASKED, '1').catch(() => {});
      if (picks.length) save(picks, 'user');
    },
    [save],
  );

  return { picked, auto, asked, toggle, clear: () => save([], 'user'), learn, finishIntro };
}

/** [matching, everything else]; with nothing picked, everything counts as matching. */
export function splitByInterest<T extends { category: string }>(items: T[], picked: string[]): [T[], T[]] {
  if (picked.length === 0) return [items, []];
  return [items.filter((i) => picked.includes(i.category)), items.filter((i) => !picked.includes(i.category))];
}
