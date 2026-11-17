import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ago, catLabel, inr, timeLeft, verdictText } from '../lib/format';
import { useT } from '../lib/i18n';
import { C } from '../lib/theme';
import type { FeedItem, Verdict } from '../lib/types';

interface Props {
  r: FeedItem;
  meId: string;
  onVote?: (id: string, v: Verdict) => void;
  onPress?: () => void;
  full?: boolean;
}

export function RequestCard({ r, meId, onVote, onPress, full }: Props) {
  const { t } = useT();
  const left = timeLeft(r.closes_at, t);
  const mine = r.user_id === meId;
  const total = r.approve_count + r.reject_count;
  const yesPct = total ? Math.round((r.approve_count / total) * 100) : 0;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      <View style={s.row}>
        <Text style={s.handle}>
          {r.handle}
          {mine ? t('card.you') : ''}
        </Text>
        <Text style={s.meta}>
          {catLabel(r.category, t)} · {ago(r.created_at, t)}
        </Text>
      </View>

      <View style={[s.row, { alignItems: 'flex-start', marginTop: 8 }]}>
        <Text style={s.item} numberOfLines={full ? undefined : 2}>
          {r.item}
        </Text>
        <Text style={s.price}>{inr(r.price_inr)}</Text>
      </View>

      <Text style={s.reason} numberOfLines={full ? undefined : 3}>
        “{r.reason}”
      </Text>
      {r.alternative ? <Text style={s.alt}>{t('card.cheaper', { alt: r.alternative })}</Text> : null}

      {/* vote bar */}
      <View style={s.bar}>
        {total === 0 ? (
          <View style={{ flex: 1, backgroundColor: C.line }} />
        ) : (
          <>
            <View style={{ flex: r.approve_count, backgroundColor: C.yes }} />
            <View style={{ flex: r.reject_count, backgroundColor: C.no }} />
          </>
        )}
      </View>
      <View style={s.row}>
        <Text style={[s.count, { color: C.yes }]}>👍 {r.approve_count} · {total ? yesPct : 0}%</Text>
        <Text style={s.meta}>{left ? `⏳ ${left}` : verdictText(r, t)}</Text>
        <Text style={[s.count, { color: C.no }]}>{r.reject_count} 👎</Text>
      </View>

      {r.outcome ? (
        <Text style={[s.badge, r.outcome === 'skipped' ? { backgroundColor: C.yesSoft, color: C.yes } : null]}>
          {r.outcome === 'skipped' ? t('card.skipped', { amt: inr(r.price_inr) }) : t('card.bought')}
        </Text>
      ) : null}

      {!mine && left && onVote ? (
        <View style={s.btns}>
          <VoteBtn label={t('card.yes')} active={r.my_vote === 'approve'} color={C.yes} soft={C.yesSoft} onPress={() => onVote(r.id, 'approve')} />
          <VoteBtn label={t('card.no')} active={r.my_vote === 'reject'} color={C.no} soft={C.noSoft} onPress={() => onVote(r.id, 'reject')} />
        </View>
      ) : null}

      {!full && r.comment_count > 0 ? <Text style={[s.meta, { marginTop: 10 }]}>{t('card.comments', { n: r.comment_count })}</Text> : null}
    </Pressable>
  );
}

function VoteBtn(p: { label: string; active: boolean; color: string; soft: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={p.onPress}
      style={[s.btn, { borderColor: p.color, backgroundColor: p.active ? p.color : p.soft }]}
      accessibilityRole="button"
      accessibilityState={{ selected: p.active }}
    >
      <Text style={[s.btnT, { color: p.active ? '#fff' : p.color }]}>{p.label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  handle: { fontSize: 13, fontWeight: '600', color: C.sub },
  meta: { fontSize: 12, color: C.sub },
  item: { flex: 1, fontSize: 18, fontWeight: '700', color: C.ink },
  price: { fontSize: 18, fontWeight: '800', color: C.brand },
  reason: { marginTop: 8, fontSize: 15, lineHeight: 21, color: C.ink },
  alt: { marginTop: 8, fontSize: 13, color: C.sub },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 14, marginBottom: 6 },
  count: { fontSize: 13, fontWeight: '700' },
  badge: { marginTop: 10, alignSelf: 'flex-start', fontSize: 13, fontWeight: '600', color: C.ink, backgroundColor: C.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  btns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnT: { fontSize: 15, fontWeight: '700' },
});
