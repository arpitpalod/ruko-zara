import { BadgeCheck, Ban, EyeOff, IconText, PartyPopper, ShoppingBag } from './Icon';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ago, catLabel, domainOf, inr, timeLeft, verdictText } from '../lib/format';
import { openLink } from '../lib/legal';
import { useT, type Key } from '../lib/i18n';
import { REASONS, sideOf, type ReasonCount, type VoteReason } from '../lib/reasons';
import { useUser } from '../lib/session';
import { C } from '../lib/theme';
import type { FeedItem, Verdict } from '../lib/types';

interface Props {
  r: FeedItem;
  meId: string;
  /** Called once a reason is picked: tapping Buy it / Skip it only opens the reasons. */
  onVote?: (id: string, v: Verdict, reason: VoteReason) => void;
  /** Full view: how many voters gave each reason (shown with the results). */
  reasons?: ReasonCount[];
  onPress?: () => void;
  full?: boolean;
  /** Admins only: the author is banned. */
  authorBanned?: boolean;
}

/**
 * One arzi. Results stay hidden until you vote (seeing a lopsided count first nudges people to
 * follow the crowd), except on your own arzi, after voting closes, and for admins.
 */
// Verified voters' split under each result: built and counted, but not shown for now (Arpit, 18 Nov).
const SHOW_VERIFIED_VOTES = false;

export function RequestCard({ r: real, meId, onVote, onPress, full, authorBanned, reasons }: Props) {
  const { t, lang } = useT();
  const viewer = useUser();
  // Which side's reasons are open. A vote is cast only when a reason is picked (one more tap).
  const [picking, setPicking] = useState<Verdict | null>(null);
  // Example arzi carry demo vote counts; they're added for display and always tagged "demo".
  const demo = (real.demo_approve ?? 0) + (real.demo_reject ?? 0) > 0;
  const r = demo
    ? { ...real, approve_count: real.approve_count + (real.demo_approve ?? 0), reject_count: real.reject_count + (real.demo_reject ?? 0) }
    : real;
  const left = timeLeft(r.closes_at, t);
  const mine = !!meId && r.user_id === meId;
  // A preview (not signed in yet) of an open arzi carries only the total, never the split.
  const total = r.preview && r.vote_total != null ? r.vote_total : r.approve_count + r.reject_count;
  const vTotal = (r.verified_approve ?? 0) + (r.verified_reject ?? 0);
  const yesPct = total ? Math.round((r.approve_count / total) * 100) : 0;
  const showResults = !(r.preview && left) && (!!r.my_vote || mine || !left || viewer.isAdmin);
  const canVote = !mine && !!left && !!onVote;
  const footer = [left ?? verdictText(r, t), r.comment_count > 0 ? t('card.comments', { n: r.comment_count }) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <CardBox onPress={onPress}>
      {viewer.isAdmin && authorBanned ? <IconText icon={Ban} color={C.no} box={s.flag} style={s.flagT}>{t('admin.bannedBadge')}</IconText> : null}
      {viewer.isAdmin && real.hidden ? <IconText icon={EyeOff} color={C.no} box={s.flag} style={s.flagT}>{t('admin.hiddenBadge')}</IconText> : null}

      <View style={s.top}>
        <Text style={s.item} numberOfLines={full ? undefined : 2}>
          {r.item}
        </Text>
        <Text style={s.price}>{inr(r.price_inr)}</Text>
      </View>
      <Text style={s.meta} numberOfLines={1}>
        {catLabel(r.category, t)} · {ago(r.created_at, t)} · {r.handle}
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
          {full && reasons?.length ? <ReasonTally reasons={reasons} votes={real.approve_count + real.reject_count} /> : null}
          {SHOW_VERIFIED_VOTES && vTotal > 0 && vTotal < total ? (
            <IconText icon={BadgeCheck} size={13} color={C.sub} style={s.verifiedT} box={{ marginTop: 6 }}>
              {t('card.verified', { p: Math.round((100 * (r.verified_approve ?? 0)) / vTotal), n: vTotal })}
            </IconText>
          ) : null}
        </View>
      ) : (
        <Text style={[s.meta, s.results]}>
          {total === 0 ? t('card.firstVote') : r.my_vote ? t('card.votes', { n: total }) : `${t('card.votes', { n: total })} · ${t('card.hidden')}`}
        </Text>
      )}

      {r.outcome ? (
        <IconText
          icon={r.outcome === 'skipped' ? PartyPopper : ShoppingBag}
          color={r.outcome === 'skipped' ? C.yes : C.ink}
          box={[s.badge, r.outcome === 'skipped' ? { backgroundColor: C.yesSoft } : null]}
          style={s.badgeT}
        >
          {r.outcome === 'skipped' ? t('card.skipped', { amt: inr(r.price_inr) }) : t('card.bought')}
        </IconText>
      ) : null}

      {canVote ? (
        <View style={s.btns}>
          <VoteBtn
            label={t('card.yes')}
            active={r.my_vote === 'approve'}
            open={picking === 'approve'}
            soft={C.yesSoft}
            color={C.yes}
            onPress={() => setPicking((p) => (p === 'approve' ? null : 'approve'))}
          />
          <VoteBtn
            label={t('card.no')}
            active={r.my_vote === 'reject'}
            open={picking === 'reject'}
            soft={C.noSoft}
            color={C.no}
            onPress={() => setPicking((p) => (p === 'reject' ? null : 'reject'))}
          />
        </View>
      ) : null}
      {canVote && picking ? (
        <View style={s.why}>
          <Text style={s.whyT}>{t('reason.prompt')}</Text>
          <View style={s.chips}>
            {REASONS[picking].map((code) => {
              const color = picking === 'approve' ? C.yes : C.no;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    setPicking(null);
                    onVote!(r.id, picking, code);
                  }}
                  style={({ pressed }) => [s.chip, { borderColor: color }, pressed && { backgroundColor: color }]}
                  accessibilityRole="button"
                  testID={`reason-${code}`}
                >
                  {({ pressed }) => <Text style={[s.chipT, { color: pressed ? '#fff' : color }]}>{t(`reason.${code}` as Key)}</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {footer ? <Text style={[s.meta, { marginTop: 10 }]}>{footer}</Text> : null}
    </CardBox>
  );
}

/** Tappable in lists; a plain box on the arzi page. A disabled wrapper would mark the vote buttons
 * inside it as disabled for screen readers. */
function CardBox({ onPress, children }: { onPress?: () => void; children: ReactNode }) {
  if (!onPress) return <View style={s.card}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}>
      {children}
    </Pressable>
  );
}

function VoteBtn(p: { label: string; active: boolean; open: boolean; soft: string; color: string; onPress: () => void }) {
  // Filled: your vote. Tinted: reasons open for this side, vote not cast yet.
  const filled = p.active && !p.open;
  return (
    <Pressable
      onPress={p.onPress}
      style={({ pressed }) => [
        s.btn,
        filled && { backgroundColor: p.color, borderColor: p.color },
        p.open && { backgroundColor: p.soft, borderColor: p.color },
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: p.active, expanded: p.open }}
    >
      <Text style={[s.btnT, { color: filled ? '#fff' : p.color }]}>{p.label}</Text>
    </Pressable>
  );
}

/** "Why people voted": each reason with its count, most given first. Votes cast before reasons
 * existed (or from older apps) have none, so it says how many votes the tally covers. */
function ReasonTally({ reasons, votes }: { reasons: ReasonCount[]; votes: number }) {
  const { t } = useT();
  const rows = reasons.filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const max = Math.max(...rows.map((x) => x.n));
  const given = rows.reduce((sum, x) => sum + x.n, 0);
  return (
    <View style={s.tally} testID="reason-tally">
      <View style={s.row}>
        <Text style={s.tallyH}>{t('reason.title')}</Text>
        {given < votes ? <Text style={s.tallyCover}>{t('reason.coverage', { n: given, total: votes })}</Text> : null}
      </View>
      {rows.map((x) => {
        const color = sideOf(x.reason) === 'approve' ? C.yes : C.no;
        return (
          <View key={x.reason} style={s.tallyRow}>
            <Text style={s.tallyT} numberOfLines={1}>
              {t(`reason.${x.reason}` as Key)}
            </Text>
            <View style={s.tallyTrack}>
              <View style={{ width: `${Math.round((100 * x.n) / max)}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
            </View>
            <Text style={s.tallyN}>{x.n}</Text>
          </View>
        );
      })}
    </View>
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
  verifiedT: { fontSize: 12.5, fontWeight: '600' },
  resultT: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  flag: { backgroundColor: C.noSoft, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  flagT: { fontSize: 12, fontWeight: '700' },
  badge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: C.brandSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeT: { fontSize: 13, fontWeight: '600' },
  btns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: C.card },
  btnT: { fontSize: 15, fontWeight: '700' },
  why: { marginTop: 12 },
  whyT: { fontSize: 13, fontWeight: '600', color: C.sub, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.card },
  chipT: { fontSize: 14, fontWeight: '600' },
  tally: { marginTop: 14, gap: 8 },
  tallyH: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 2 },
  tallyCover: { fontSize: 12.5, color: C.sub },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tallyT: { width: 150, fontSize: 13.5, color: C.ink },
  tallyTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' },
  tallyN: { minWidth: 24, textAlign: 'right', fontSize: 13, fontWeight: '700', color: C.sub },
});
