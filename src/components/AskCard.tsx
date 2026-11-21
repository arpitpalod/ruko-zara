import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { inr } from '../lib/format';
import { useT } from '../lib/i18n';
import { WEB_BASE } from '../lib/legal';
import { M, R } from '../lib/theme';
import type { FeedItem } from '../lib/types';
import { CARD_H, CARD_W } from './ResultCard';
import { Logo } from './Logo';

/** The poster's open arzi as an Instagram Story (9:16, saved at 1080×1920): "should I buy this?" */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AskCard({ r, cardRef }: { r: FeedItem; cardRef?: Ref<any> }) {
  const { t } = useT();
  return (
    <View ref={cardRef} collapsable={false} style={s.card} testID="ask-card">
      <Logo size={17} color="#fff" devTag={false} />
      <View style={s.panel}>
        <Text style={s.asked}>{t('ask.label')}</Text>
        <Text style={s.item} numberOfLines={3}>{r.item}</Text>
        <Text style={s.price}>{inr(r.price_inr)}</Text>
        <View style={s.rule} />
        <Text style={s.reason} numberOfLines={5}>“{r.reason}”</Text>
        <View style={s.pair}>
          <View style={[s.half, s.left, { backgroundColor: M.yesContainer }]}>
            <Text style={[s.halfT, { color: M.onYesContainer }]}>{t('card.yes')}</Text>
          </View>
          <View style={[s.half, s.right, { backgroundColor: M.noContainer }]}>
            <Text style={[s.halfT, { color: M.onNoContainer }]}>{t('card.no')}</Text>
          </View>
        </View>
        <Text style={s.cta}>{t('ask.cta')}</Text>
      </View>
      <View>
        <Text style={s.tag}>{t('rc.tagline')}</Text>
        <Text style={s.link}>{WEB_BASE.replace(/^https?:\/\//, '')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, backgroundColor: M.brand, padding: 22, justifyContent: 'space-between' },
  panel: { backgroundColor: M.surfaceContainerLowest, borderRadius: R.xl, padding: 22, gap: 2 },
  asked: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.3, color: M.onSurfaceVariant },
  item: { fontSize: 22, fontWeight: '700', color: M.onSurface, lineHeight: 28, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '600', color: M.onSurfaceVariant, marginTop: 2 },
  rule: { height: 1, backgroundColor: M.outlineVariant, marginVertical: 14 },
  reason: { fontSize: 15, lineHeight: 21, color: M.onSurface },
  pair: { flexDirection: 'row', gap: 4, marginTop: 16 },
  half: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  left: { borderTopLeftRadius: R.full, borderBottomLeftRadius: R.full, borderTopRightRadius: R.sm, borderBottomRightRadius: R.sm },
  right: { borderTopRightRadius: R.full, borderBottomRightRadius: R.full, borderTopLeftRadius: R.sm, borderBottomLeftRadius: R.sm },
  halfT: { fontSize: 15, fontWeight: '700' },
  cta: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: M.onSurfaceVariant, textAlign: 'center', marginTop: 10 },
  tag: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  link: { color: '#FFE3D2', fontSize: 12.5, marginTop: 2 },
});
