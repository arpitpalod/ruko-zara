import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '../lib/i18n';
import { M, T } from '../lib/theme';
import type { FeedItem, Outcome } from '../lib/types';
import { verdictOf } from '../lib/verdict';
import { CircleCheck, CirclePlus, IconText, PartyPopper, ShoppingBag } from './Icon';
import { Button, Card } from './ui';

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
export function PostNudge({ votes, onDismiss }: { votes: number; onDismiss: () => void }) {
  const { t } = useT();
  return (
    // Laid out like a request card (title + price, meta line, text, one big button) so it reads as "yours goes here".
    <Card testID="post-nudge">
      <View style={s.top}>
        <Text style={s.item}>{t('nudge.ask')}</Text>
        <Text style={s.price}>₹ ?</Text>
      </View>
      <Text style={s.meta}>{t('nudge.meta')} · {t('nudge.helped', { n: votes })}</Text>
      <Text style={s.body}>{t('nudge.body')}</Text>
      <Button label={t('save.postTop')} icon={CirclePlus} size="lg" block style={{ marginTop: 14 }} onPress={() => router.push('/new')} />
      <Button label={t('nudge.notNow')} variant="text" size="sm" block colors={{ bg: 'transparent', fg: M.onSurfaceVariant }} style={{ marginTop: 4 }} onPress={onDismiss} />
    </Card>
  );
}

const s = StyleSheet.create({
  box: { gap: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  item: { ...T.titleMedium, flex: 1, color: M.onSurface },
  price: { ...T.titleMedium, fontWeight: '700', color: M.primary },
  meta: { ...T.bodySmall, color: M.onSurfaceVariant, marginTop: 2 },
  body: { ...T.body, marginTop: 10, color: M.onSurface },
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
