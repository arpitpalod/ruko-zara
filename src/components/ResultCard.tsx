import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { inr } from '../lib/format';
import { useT, type Key } from '../lib/i18n';
import { WEB_BASE } from '../lib/legal';
import { sideOf, type ReasonCount } from '../lib/reasons';
import { C } from '../lib/theme';
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
  const color = v.side === 'approve' ? C.yes : C.no;
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
              const c = sideOf(x.reason) === 'approve' ? C.yes : C.no;
              return (
                <View key={x.reason} style={[s.chip, { borderColor: c }]}>
                  <Text style={[s.chipT, { color: c }]} numberOfLines={1}>
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
  card: { width: CARD_W, height: CARD_H, backgroundColor: C.brand, borderRadius: 0, padding: 22, justifyContent: 'space-between' },
  panel: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 2 },
  asked: { fontSize: 12, fontWeight: '700', color: C.sub },
  item: { fontSize: 22, fontWeight: '800', color: C.ink, lineHeight: 27, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '600', color: C.sub, marginTop: 2 },
  rule: { height: 1, backgroundColor: C.line, marginVertical: 12 },
  pct: { fontSize: 60, fontWeight: '900', lineHeight: 64, letterSpacing: -1 },
  said: { fontSize: 18, fontWeight: '800' },
  votes: { fontSize: 13, color: C.sub, marginTop: 2 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '100%' },
  chipT: { fontSize: 12, fontWeight: '700' },
  saved: { backgroundColor: C.yesSoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginTop: 12 },
  savedT: { color: C.yes, fontWeight: '800', fontSize: 13.5 },
  tag: { color: '#fff', fontSize: 15, fontWeight: '800' },
  link: { color: '#FFE3D2', fontSize: 12, marginTop: 2 },
});
