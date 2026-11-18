import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ago, catLabel, displayHandle, domainOf, inr, timeLeft, verdictText } from '../lib/format';
import { openLink } from '../lib/legal';
import { useT } from '../lib/i18n';
import { useUser } from '../lib/session';
import { C } from '../lib/theme';
import type { FeedItem, Verdict } from '../lib/types';

interface Props {
  r: FeedItem;
  meId: string;
  onVote?: (id: string, v: Verdict) => void;
  onPress?: () => void;
  full?: boolean;
  /** Admins only: the author is banned. */
  authorBanned?: boolean;
}

/**
 * One arzi. Results stay hidden until you vote (seeing a lopsided count first nudges people to
 * follow the crowd), except on your own arzi, after voting closes, and for admins.
 */
export function RequestCard({ r: real, meId, onVote, onPress, full, authorBanned }: Props) {
  const { t, lang } = useT();
  const viewer = useUser();
  // Example arzi carry demo vote counts; they're added for display and always tagged "demo".
  const demo = (real.demo_approve ?? 0) + (real.demo_reject ?? 0) > 0;
  const r = demo
    ? { ...real, approve_count: real.approve_count + (real.demo_approve ?? 0), reject_count: real.reject_count + (real.demo_reject ?? 0) }
    : real;
  const left = timeLeft(r.closes_at, t);
  const mine = r.user_id === meId;
  const total = r.approve_count + r.reject_count;
  const yesPct = total ? Math.round((r.approve_count / total) * 100) : 0;
  const showResults = !!r.my_vote || mine || !left || viewer.isAdmin;
  const canVote = !mine && !!left && !!onVote;
  const footer = [left ?? verdictText(r, t), r.comment_count > 0 ? t('card.comments', { n: r.comment_count }) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}>
      {viewer.isAdmin && authorBanned ? <Text style={s.flag}>{t('admin.bannedBadge')}</Text> : null}
      {viewer.isAdmin && real.hidden ? <Text style={s.flag}>{t('admin.hiddenBadge')}</Text> : null}

      <View style={s.top}>
        <Text style={s.item} numberOfLines={full ? undefined : 2}>
          {r.item}
        </Text>
        <Text style={s.price}>{inr(r.price_inr)}</Text>
      </View>
      <Text style={s.meta} numberOfLines={1}>
        {catLabel(r.category, t)} · {ago(r.created_at, t)} · {displayHandle(r.handle, lang)}
        {mine ? t('card.you') : ''}
      </Text>

      <Text style={s.reason} numberOfLines={full ? undefined : 2}>
        {r.reason}
      </Text>
      {full && r.alternative ? <Text style={s.alt}>{t('card.cheaper', { alt: r.alternative })}</Text> : null}
      {r.link ? (
        <Pressable onPress={() => openLink(r.link!)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Text style={s.link}>{domainOf(r.link)} ↗</Text>
        </Pressable>
      ) : null}

      {showResults && total > 0 ? (
        <View style={s.results}>
          <View style={s.bar}>
            <View style={{ flex: r.approve_count, backgroundColor: C.yes }} />
            <View style={{ flex: r.reject_count, backgroundColor: C.no }} />
          </View>
          <View style={s.row}>
            <Text style={s.resultT}>{t('card.result', { p: yesPct })}</Text>
            <Text style={s.meta}>
              {t('card.votes', { n: total })}
              {demo ? ` · ${t('card.demo')}` : ''}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[s.meta, s.results]}>
          {total === 0 ? t('card.firstVote') : `${t('card.votes', { n: total })} · ${t('card.hidden')}`}
        </Text>
      )}

      {r.outcome ? (
        <Text style={[s.badge, r.outcome === 'skipped' ? { backgroundColor: C.yesSoft, color: C.yes } : null]}>
          {r.outcome === 'skipped' ? t('card.skipped', { amt: inr(r.price_inr) }) : t('card.bought')}
        </Text>
      ) : null}

      {canVote ? (
        <View style={s.btns}>
          <VoteBtn label={t('card.yes')} active={r.my_vote === 'approve'} color={C.yes} onPress={() => onVote!(r.id, 'approve')} />
          <VoteBtn label={t('card.no')} active={r.my_vote === 'reject'} color={C.no} onPress={() => onVote!(r.id, 'reject')} />
        </View>
      ) : null}

      {footer ? <Text style={[s.meta, { marginTop: 10 }]}>{footer}</Text> : null}
    </Pressable>
  );
}

function VoteBtn(p: { label: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={p.onPress}
      style={({ pressed }) => [s.btn, p.active && { backgroundColor: p.color, borderColor: p.color }, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: p.active }}
    >
      <Text style={[s.btnT, { color: p.active ? '#fff' : p.color }]}>{p.label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  item: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '700', color: C.ink },
  price: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12.5, color: C.sub, marginTop: 3 },
  reason: { marginTop: 10, fontSize: 15, lineHeight: 21, color: C.ink },
  alt: { marginTop: 8, fontSize: 14, lineHeight: 20, color: C.sub },
  link: { marginTop: 8, fontSize: 13.5, fontWeight: '600', color: C.brand },
  results: { marginTop: 14 },
  bar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  resultT: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  flag: { fontSize: 12, fontWeight: '700', color: C.no, backgroundColor: C.noSoft, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  badge: { marginTop: 10, alignSelf: 'flex-start', fontSize: 13, fontWeight: '600', color: C.ink, backgroundColor: C.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  btns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: C.card },
  btnT: { fontSize: 15, fontWeight: '700' },
});
