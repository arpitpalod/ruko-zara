import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from './api';
import { useUser } from './session';

/** Money saved = price of your arzi marked "Didn't buy". Kept between screens so it never flashes. */
let last = 0;

export function useSavings(): number {
  const user = useUser();
  const [saved, setSaved] = useState(last);
  useFocusEffect(
    useCallback(() => {
      if (!user.id) return; // not signed in yet: nothing saved yet
      let live = true;
      api.mine().then(
        (xs) => {
          last = xs.filter((x) => x.outcome === 'skipped').reduce((a, x) => a + x.price_inr, 0);
          if (live) setSaved(last);
        },
        () => {},
      );
      return () => {
        live = false;
      };
    }, [user.id]),
  );
  return saved;
}
