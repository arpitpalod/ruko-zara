import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '../lib/i18n';
import { M, T } from '../lib/theme';
import type { FeedItem, Outcome } from '../lib/types';
import { verdictOf } from '../lib/verdict';
import { CirclePlus, PartyPopper, ShoppingBag } from './Icon';
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
    <Card variant="filled" style={s.box} testID="post-nudge">
      <Text style={s.head}>{t('nudge.helped', { n: votes })}</Text>
      <Text style={s.ask}>{t('nudge.ask')}</Text>
      <View style={s.row}>
        <Button label={t('save.postTop')} icon={CirclePlus} size="sm" onPress={() => router.push('/new')} />
        <Button label={t('nudge.notNow')} variant="text" size="sm" colors={{ bg: 'transparent', fg: M.onSurfaceVariant }} onPress={onDismiss} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  box: { gap: 4 },
  head: { ...T.titleSmall, fontSize: 15, color: M.onSurface },
  verdict: { ...T.labelLarge, fontWeight: '700' },
  ask: { ...T.bodySmall, fontSize: 14, color: M.onSurfaceVariant, marginTop: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
});
