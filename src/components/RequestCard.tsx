import { ArrowUpRight, BadgeCheck, Ban, Check, CirclePause, EyeOff, IconText, PartyPopper, ShoppingBag, ShoppingCart, type LucideIcon } from './Icon';
import { Card } from './ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ago, catLabel, domainOf, inr, timeLeft, verdictText } from '../lib/format';
import { openLink } from '../lib/legal';
import { useT, type Key } from '../lib/i18n';
import { REASONS, sideOf, type ReasonCount, type VoteReason } from '../lib/reasons';
import { useUser } from '../lib/session';
import { M, R, T } from '../lib/theme';
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
    <Card onPress={onPress}>
      {viewer.isAdmin && authorBanned ? <IconText icon={Ban} size={14} color={M.onSurfaceVariant} box={s.flag} style={s.flagT}>{t('admin.bannedBadge')}</IconText> : null}
      {viewer.isAdmin && real.hidden ? <IconText icon={EyeOff} size={14} color={M.onSurfaceVariant} box={s.flag} style={s.flagT}>{t('admin.hiddenBadge')}</IconText> : null}

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
        <Pressable onPress={() => openLink(r.link!)} hitSlop={8} style={s.linkBox} accessibilityRole="link">
          <Text style={s.link}>{domainOf(r.link)}</Text>
          <ArrowUpRight size={15} color={M.primary} strokeWidth={2.25} />
        </Pressable>
      ) : null}

      {showResults && total > 0 ? (
        <View style={s.results}>
          <View style={s.bar}>
            {r.approve_count > 0 ? <View style={{ flex: r.approve_count, backgroundColor: M.yes, borderRadius: R.full }} /> : null}
            {r.reject_count > 0 ? <View style={{ flex: r.reject_count, backgroundColor: M.no, borderRadius: R.full }} /> : null}
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
            <IconText icon={BadgeCheck} size={13} color={M.onSurfaceVariant} style={s.verifiedT} box={{ marginTop: 6 }}>
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
          color={r.outcome === 'skipped' ? M.onYesContainer : M.onSurfaceVariant}
          size={16}
          box={[s.badge, r.outcome === 'skipped' ? { backgroundColor: M.yesContainer } : null]}
          style={s.badgeT}
        >
          {r.outcome === 'skipped' ? t('card.skipped', { amt: inr(r.price_inr) }) : t('card.bought')}
        </IconText>
      ) : null}

      {canVote ? (
        <View style={s.btns}>
          <VoteBtn
            label={t('card.yes')}
            icon={ShoppingCart}
            side="left"
            active={r.my_vote === 'approve'}
            open={picking === 'approve'}
            c={{ bg: M.yesContainer, fg: M.onYesContainer, solid: M.yes }}
            onPress={() => setPicking((p) => (p === 'approve' ? null : 'approve'))}
          />
          <VoteBtn
            label={t('card.no')}
            icon={CirclePause}
            side="right"
            active={r.my_vote === 'reject'}
            open={picking === 'reject'}
            c={{ bg: M.noContainer, fg: M.onNoContainer, solid: M.no }}
            onPress={() => setPicking((p) => (p === 'reject' ? null : 'reject'))}
          />
        </View>
      ) : null}
      {canVote && picking ? (
        <View style={s.why}>
          <Text style={s.whyT}>{t(picking === 'approve' ? 'reason.whyYes' : 'reason.whyNo')}</Text>
          <View style={s.grid}>
            {REASONS[picking].map((code) => (
              <View key={code} style={s.cell}>
                <ReasonBtn
                  label={t(`reason.${code}` as Key)}
                  c={picking === 'approve' ? { bg: M.yesContainer, fg: M.onYesContainer, solid: M.yes } : { bg: M.noContainer, fg: M.onNoContainer, solid: M.no }}
                  onPress={() => {
                    setPicking(null);
                    onVote!(r.id, picking, code);
                  }}
                  testID={`reason-${code}`}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {footer ? <Text style={[s.meta, { marginTop: 10 }]}>{footer}</Text> : null}
    </Card>
  );
}

/**
 * Buy it / Skip it: a connected pair (Material 3 button group), always the same shape. The tapped
 * side gets an outline in its colour; your vote turns solid with a check mark.
 */
function VoteBtn(p: {
  label: string;
  icon: LucideIcon;
  side: 'left' | 'right';
  active: boolean;
  open: boolean;
  c: { bg: string; fg: string; solid: string };
  onPress: () => void;
}) {
  // Solid: your vote. Outlined in the side's colour: reasons open for this side, vote not cast yet.
  const solid = p.active && !p.open;
  const fg = solid ? '#FFFFFF' : p.c.fg;
  const I = solid ? Check : p.icon;
  return (
    <Pressable
      onPress={p.onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: solid ? p.c.solid : p.c.bg },
        p.side === 'left' ? { borderTopRightRadius: R.sm, borderBottomRightRadius: R.sm } : { borderTopLeftRadius: R.sm, borderBottomLeftRadius: R.sm },
        p.open && { borderWidth: 2, borderColor: p.c.solid },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: p.active, expanded: p.open }}
    >
      <I size={18} color={fg} strokeWidth={2.4} />
      <Text style={[s.btnT, { color: fg }]}>{p.label}</Text>
    </Pressable>
  );
}

/** One reason, filled in its side's light colour; solid while pressed. Picking it casts the vote. */
function ReasonBtn(p: { label: string; c: { bg: string; fg: string; solid: string }; onPress: () => void; testID: string }) {
  return (
    <Pressable
      onPress={p.onPress}
      testID={p.testID}
      accessibilityRole="button"
      style={({ pressed }) => [s.reasonBtn, { backgroundColor: pressed ? p.c.solid : p.c.bg }]}
    >
      {({ pressed }) => <Text style={[s.reasonT, { color: pressed ? '#FFFFFF' : p.c.fg }]}>{p.label}</Text>}
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
        const color = sideOf(x.reason) === 'approve' ? M.yes : M.no;
        return (
          <View key={x.reason} style={s.tallyRow}>
            <Text style={s.tallyT} numberOfLines={1}>
              {t(`reason.${x.reason}` as Key)}
            </Text>
            <View style={s.tallyTrack}>
              <View style={{ width: `${Math.round((100 * x.n) / max)}%`, height: '100%', backgroundColor: color, borderRadius: R.full }} />
            </View>
            <Text style={s.tallyN}>{x.n}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  item: { ...T.titleMedium, flex: 1, color: M.onSurface },
  price: { ...T.titleMedium, fontWeight: '700', color: M.onSurface },
  meta: { ...T.bodySmall, color: M.onSurfaceVariant, marginTop: 2 },
  reason: { ...T.body, marginTop: 10, color: M.onSurface },
  alt: { ...T.bodySmall, fontSize: 14, lineHeight: 20, marginTop: 8, color: M.onSurfaceVariant },
  linkBox: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginTop: 8 },
  link: { ...T.labelLarge, color: M.primary },
  results: { marginTop: 14 },
  // Material 3 Expressive progress: two rounded segments with a gap between them.
  bar: { flexDirection: 'row', gap: 4, height: 8, marginBottom: 8 },
  verifiedT: { ...T.labelMedium },
  resultT: { ...T.labelLarge, color: M.onSurface },
  flag: { backgroundColor: M.surfaceContainerHigh, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm, marginBottom: 8 },
  flagT: { ...T.labelMedium, color: M.onSurfaceVariant },
  badge: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: M.surfaceContainerHigh, paddingHorizontal: 12, minHeight: 32, borderRadius: R.sm },
  badgeT: { ...T.labelLarge },
  btns: { flexDirection: 'row', gap: 3, marginTop: 14 },
  btn: { flex: 1, flexDirection: 'row', gap: 8, minHeight: 48, borderRadius: R.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  btnT: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  why: { marginTop: 14 },
  whyT: { ...T.titleSmall, color: M.onSurfaceVariant, marginBottom: 8 },
  // Two equal columns: 4 reasons make a 2×2, 3 make 2 + 1.
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  cell: { width: '50%', padding: 4 },
  reasonBtn: { flex: 1, minHeight: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  reasonT: { ...T.labelLarge, fontWeight: '700', textAlign: 'center' },
  tally: { marginTop: 16, gap: 10 },
  tallyH: { ...T.titleSmall, color: M.onSurface, marginBottom: 2 },
  tallyCover: { ...T.bodySmall, color: M.onSurfaceVariant },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tallyT: { ...T.bodySmall, fontSize: 14, width: 150, color: M.onSurface },
  tallyTrack: { flex: 1, height: 8, borderRadius: R.full, backgroundColor: M.surfaceContainerHigh, overflow: 'hidden' },
  tallyN: { ...T.labelLarge, minWidth: 24, textAlign: 'right', color: M.onSurfaceVariant },
});
