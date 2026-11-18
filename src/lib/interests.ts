import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** Categories the person cares about; their feed shows these first. Remembered on this device. */
const KEY = 'ruko-zara.interests';

export function useInterests() {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        const parsed = v ? JSON.parse(v) : [];
        if (Array.isArray(parsed)) setPicked(parsed.filter((x) => typeof x === 'string'));
      })
      .catch(() => {});
  }, []);

  const save = useCallback((next: string[]) => {
    setPicked(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const toggle = useCallback(
    (c: string) => save(picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c]),
    [picked, save],
  );

  return { picked, toggle, clear: () => save([]) };
}

/** [matching, everything else]; with nothing picked, everything counts as matching. */
export function splitByInterest<T extends { category: string }>(items: T[], picked: string[]): [T[], T[]] {
  if (picked.length === 0) return [items, []];
  return [items.filter((i) => picked.includes(i.category)), items.filter((i) => !picked.includes(i.category))];
}
