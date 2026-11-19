import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '../lib/i18n';
import { C } from '../lib/theme';
import type { FeedItem, Outcome } from '../lib/types';
import { verdictOf } from '../lib/verdict';
import { CirclePlus, IconText } from './Icon';

/** "Voting closed on X: 72% said Skip it. Did you buy it?" Asked once per arzi; also answerable in My requests. */
export function DecideCard({ r, onAnswer }: { r: FeedItem; onAnswer: (o: Outcome | null) => void }) {
  const { t } = useT();
  const v = verdictOf(r);
  return (
    <View style={s.box} testID="decide-card">
      <Text style={s.head} numberOfLines={2}>{t('decide.title', { item: r.item })}</Text>
      {v.total ? (
        <Text style={[s.verdict, { color: v.side === 'approve' ? C.yes : C.no }]}>
          {v.pct}% {t('rc.said', { side: t(v.side === 'approve' ? 'card.yes' : 'card.no') })}
        </Text>
      ) : null}
      <Text style={s.ask}>{t('decide.ask')}</Text>
      <View style={s.row}>
        <Pressable style={[s.btn, { backgroundColor: C.yesSoft }]} onPress={() => onAnswer('skipped')} accessibilityRole="button">
          <Text style={[s.btnT, { color: C.yes }]}>{t('mine.skip')}</Text>
        </Pressable>
        <Pressable style={[s.btn, { backgroundColor: C.brandSoft }]} onPress={() => onAnswer('bought')} accessibilityRole="button">
          <Text style={[s.btnT, { color: C.brand }]}>{t('mine.bought')}</Text>
        </Pressable>
        <Pressable style={s.later} onPress={() => onAnswer(null)} accessibilityRole="button">
          <Text style={s.laterT}>{t('decide.later')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "You've helped 5 people decide. What are you about to buy?" */
export function PostNudge({ votes, onDismiss }: { votes: number; onDismiss: () => void }) {
  const { t } = useT();
  return (
    <View style={s.box} testID="post-nudge">
      <Text style={s.head}>{t('nudge.helped', { n: votes })}</Text>
      <Text style={s.ask}>{t('nudge.ask')}</Text>
      <View style={s.row}>
        <Pressable style={[s.btn, { backgroundColor: C.brand }]} onPress={() => router.push('/new')} accessibilityRole="button">
          <IconText icon={CirclePlus} size={15} color="#fff" style={[s.btnT, { color: '#fff' }]}>{t('save.postTop')}</IconText>
        </Pressable>
        <Pressable style={s.later} onPress={onDismiss} accessibilityRole="button">
          <Text style={s.laterT}>{t('nudge.notNow')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, gap: 4 },
  head: { fontSize: 15, fontWeight: '800', color: C.ink },
  verdict: { fontSize: 14, fontWeight: '800' },
  ask: { fontSize: 14, color: C.sub, marginTop: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  btn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  btnT: { fontSize: 14, fontWeight: '800' },
  later: { paddingHorizontal: 6, paddingVertical: 8 },
  laterT: { fontSize: 14, fontWeight: '600', color: C.sub },
});
