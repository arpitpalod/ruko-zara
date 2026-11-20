import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { inr } from '../lib/format';
import { useT, type Key } from '../lib/i18n';
import { WEB_BASE } from '../lib/legal';
import { sideOf, type ReasonCount } from '../lib/reasons';
import { M, R } from '../lib/theme';
import type { FeedItem } from '../lib/types';
import { verdictOf } from '../lib/verdict';
import { Logo } from './Logo';

/** Story-shaped (9:16) so it fills a WhatsApp Status or an Instagram Story. Saved at 1080×1920. */
export const CARD_W = 315;
export const CARD_H = 560;

/** The image a poster shares: what they asked, what India said and why, and what they saved. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ResultCard({ r, reasons, cardRef }: { r: FeedItem; reasons: ReasonCount[]; cardRef?: Ref<any> }) {
  const { t } = useT();
  const v = verdictOf(r);
  const color = v.side === 'approve' ? M.yes : M.no;
  const top = [...reasons].filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 2);
  return (
    <View ref={cardRef} collapsable={false} style={s.card} testID="result-card">
      <Logo size={17} color="#fff" devTag={false} />
      <View style={s.panel}>
        <Text style={s.asked}>{t('rc.asked')}</Text>
        <Text style={s.item} numberOfLines={3}>{r.item}</Text>
        <Text style={s.price}>{inr(r.price_inr)}</Text>
        <View style={s.rule} />
        <Text style={[s.pct, { color }]}>{v.pct}%</Text>
        <Text style={[s.said, { color }]}>{t('rc.said', { side: t(v.side === 'approve' ? 'card.yes' : 'card.no') })}</Text>
        <Text style={s.votes}>{t('card.votes', { n: v.total })}</Text>
        {top.length ? (
          <View style={s.reasons}>
            {top.map((x) => {
              const yes = sideOf(x.reason) === 'approve';
              return (
                <View key={x.reason} style={[s.chip, { backgroundColor: yes ? M.yesContainer : M.noContainer }]}>
                  <Text style={[s.chipT, { color: yes ? M.onYesContainer : M.onNoContainer }]} numberOfLines={1}>
                    {t(`reason.${x.reason}` as Key)} · {x.n}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {r.outcome === 'skipped' ? (
          <View style={s.saved}>
            <Text style={s.savedT}>{t('rc.saved', { amt: inr(r.price_inr) })}</Text>
          </View>
        ) : null}
      </View>
      <View>
        <Text style={s.tag}>{t('rc.tagline')}</Text>
        <Text style={s.link}>{WEB_BASE.replace(/^https?:\/\//, '')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, backgroundColor: M.brand, borderRadius: 0, padding: 22, justifyContent: 'space-between' },
  panel: { backgroundColor: M.surfaceContainerLowest, borderRadius: R.xl, padding: 22, gap: 2 },
  asked: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.3, color: M.onSurfaceVariant },
  item: { fontSize: 22, fontWeight: '700', color: M.onSurface, lineHeight: 28, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '600', color: M.onSurfaceVariant, marginTop: 2 },
  rule: { height: 1, backgroundColor: M.outlineVariant, marginVertical: 14 },
  pct: { fontSize: 64, fontWeight: '800', lineHeight: 68, letterSpacing: -1.5 },
  said: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  votes: { fontSize: 13, color: M.onSurfaceVariant, marginTop: 2 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  chip: { borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
  chipT: { fontSize: 12.5, fontWeight: '700' },
  saved: { backgroundColor: M.yesContainer, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 12, marginTop: 14 },
  savedT: { color: M.onYesContainer, fontWeight: '700', fontSize: 14 },
  tag: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  link: { color: '#FFE3D2', fontSize: 12.5, marginTop: 2 },
});
