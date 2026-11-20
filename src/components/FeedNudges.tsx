import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { catLabel } from '../lib/format';
import { useT } from '../lib/i18n';
import { M, R, T } from '../lib/theme';
import { CATEGORIES, type FeedItem, type Outcome } from '../lib/types';
import { verdictOf } from '../lib/verdict';
import { CircleCheck, CirclePlus, IconText, PartyPopper, ShoppingBag } from './Icon';
import { ChoiceGrid } from './ChoiceGrid';
import { Button, Card, Chip } from './ui';

/** "Voting closed on X: 72% said Skip it. Did you buy it?" Asked once per arzi; also answerable in My requests. */
export function DecideCard({ r, onAnswer }: { r: FeedItem; onAnswer: (o: Outcome | null) => void }) {
  const { t } = useT();
  const v = verdictOf(r);
  return (
    <Card variant="filled" style={s.box} testID="decide-card">
      <Text style={s.head} numberOfLines={2}>{t('decide.title', { item: r.item })}</Text>
      {v.total ? (
        <Text style={[s.verdict, { color: v.side === 'approve' ? M.yes : M.no }]}>
          {v.pct}% {t('rc.said', { side: t(v.side === 'approve' ? 'card.yes' : 'card.no') })}
        </Text>
      ) : null}
      <Text style={s.ask}>{t('decide.ask')}</Text>
      <View style={s.row}>
        <Button label={t('mine.skip')} icon={PartyPopper} size="sm" colors={{ bg: M.yesContainer, fg: M.onYesContainer }} onPress={() => onAnswer('skipped')} />
        <Button label={t('mine.bought')} icon={ShoppingBag} size="sm" colors={{ bg: M.surfaceContainerLowest, fg: M.onSurface, border: M.outlineVariant }} onPress={() => onAnswer('bought')} />
        <Button label={t('decide.later')} variant="text" size="sm" colors={{ bg: 'transparent', fg: M.onSurfaceVariant }} onPress={() => onAnswer(null)} />
      </View>
    </Card>
  );
}

/** "You've helped 5 people decide. What are you about to buy?" */
/** One idea per category for the "What are you about to buy?" card (Other has none). */
const IDEA_KEYS: Record<string, string> = {
  Gadgets: 'idea.phone', Fashion: 'idea.shoes', Khana: 'idea.food', Beauty: 'idea.skincare',
  Ghar: 'idea.furniture', Travel: 'idea.trip', Fun: 'idea.concert', Health: 'idea.gym',
};

/**
 * "What are you about to buy?" laid out like a request card, so it reads as the next card in the feed:
 * type the item and price right here (or tap an idea), then "Ask mine" asks the category, ordered by
 * the person's interests, and opens the full form with all of that filled in.
 */
export function PostNudge({ votes, picked, onDismiss }: { votes: number; picked: string[]; onDismiss: () => void }) {
  const { t } = useT();
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState(false); // the category grid, opened under the buttons
  const grid = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    // Bring the opened grid into view (web; the phone app's list scrolls by hand).
    if (open && Platform.OS === 'web') (grid.current as unknown as HTMLElement | null)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [open]);
  const ordered = [...picked.filter((c) => (CATEGORIES as readonly string[]).includes(c)), ...CATEGORIES.filter((c) => !picked.includes(c))];
  const ideas = ordered.filter((c) => IDEA_KEYS[c]).slice(0, 4);
  const go = (category: string) =>
    router.push({ pathname: '/new', params: { item: item.trim(), price, category } });
  return (
    <Card testID="post-nudge">
      <View style={s.top}>
        <TextInput
          value={item}
          onChangeText={(v) => {
            setItem(v);
            setCat(null); // typed their own: ask the category
          }}
          placeholder={t('nudge.ask')}
          placeholderTextColor={M.onSurface}
          maxLength={80}
          style={[s.item, s.input, s.typeHere]}
          testID="nudge-item"
        />
        <View style={s.priceBox}>
          <Text style={s.price}>₹</Text>
          <TextInput
            value={price}
            onChangeText={(v) => setPrice(v.replace(/\D/g, '').slice(0, 8))}
            placeholder="?"
            placeholderTextColor={M.primary}
            keyboardType="number-pad"
            style={[s.price, s.input, { minWidth: 28 }]}
            testID="nudge-price"
          />
        </View>
      </View>
      <Text style={s.meta}>{t('nudge.helped', { n: votes })} {t('nudge.yourTurn')}</Text>
          <View style={s.ideas}>
            {ideas.map((c) => (
              <Chip
                key={c}
                label={t(IDEA_KEYS[c] as never)}
                selected={cat === c}
                onPress={() => {
                  setItem(t(IDEA_KEYS[c] as never));
                  setCat(c);
                }}
                testID={`nudge-idea-${c}`}
              />
            ))}
          </View>
          <View style={s.pair}>
            <Pressable
              onPress={() => (cat ? go(cat) : setOpen((o) => !o))}
              accessibilityRole="button"
              testID="nudge-ask"
              style={({ pressed }) => [s.half, s.left, { backgroundColor: pressed || open ? M.onPrimaryContainer : M.primary }]}
            >
              <CirclePlus size={18} color={M.onPrimary} />
              <Text style={[s.halfT, { color: M.onPrimary }]}>{t('nudge.askMine')}</Text>
            </Pressable>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              testID="nudge-later"
              style={({ pressed }) => [s.half, s.right, { backgroundColor: pressed ? M.surfaceContainerHighest : M.surfaceContainerHigh }]}
            >
              <Text style={[s.halfT, { color: M.onSurfaceVariant }]}>{t('nudge.notNow')}</Text>
            </Pressable>
          </View>
      {open ? (
        <>
          <Text style={s.which}>{t('nudge.which')}</Text>
          <View ref={grid} style={{ marginTop: 12 }}>
            <ChoiceGrid options={ordered.map((c) => ({ id: c, label: catLabel(c, t) }))} onPick={go} testPrefix="nudge-cat-" />
          </View>
        </>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  box: { gap: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  item: { ...T.titleMedium, flex: 1, color: M.onSurface },
  price: { ...T.titleMedium, fontWeight: '700', color: M.primary },
  meta: { ...T.bodySmall, color: M.onSurfaceVariant, marginTop: 2 },
  input: { padding: 0, margin: 0, borderWidth: 0, outlineWidth: 0 } as object,
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  typeHere: { borderBottomWidth: 1.5, borderBottomColor: M.outlineVariant, paddingBottom: 4 }, // a line to write on: it's a field, not a title
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  which: { ...T.titleSmall, color: M.onSurface, marginTop: 14 },
  pair: { flexDirection: 'row', gap: 4, marginTop: 14 },
  half: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  left: { borderTopLeftRadius: R.full, borderBottomLeftRadius: R.full, borderTopRightRadius: R.sm, borderBottomRightRadius: R.sm },
  right: { borderTopRightRadius: R.full, borderBottomRightRadius: R.full, borderTopLeftRadius: R.sm, borderBottomLeftRadius: R.sm },
  halfT: { ...T.labelLarge, fontSize: 15 },
  head: { ...T.titleSmall, fontSize: 15, color: M.onSurface },
  verdict: { ...T.labelLarge, fontWeight: '700' },
  ask: { ...T.bodySmall, fontSize: 14, color: M.onSurfaceVariant, marginTop: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
});

/** Right after voting on an arzi page: keep going, or ask about your own purchase. */
export function NextCard({ onMore }: { onMore: () => void }) {
  const { t } = useT();
  return (
    <Card variant="filled" testID="next-card" style={{ gap: 10 }}>
      <IconText icon={CircleCheck} size={18} color={M.yes} style={{ ...T.titleSmall, color: M.onSurface }}>
        {t('next.done')}
      </IconText>
      <Button label={t('next.more')} size="lg" block onPress={onMore} testID="next-more" />
      <Button label={t('next.post')} icon={CirclePlus} variant="outlined" size="lg" block onPress={() => router.push('/new')} testID="next-post" />
    </Card>
  );
}
