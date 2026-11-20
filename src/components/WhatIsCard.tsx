import { StyleSheet, Text, View } from 'react-native';
import { useT } from '../lib/i18n';
import { M, R, T } from '../lib/theme';
import { Logo } from './Logo';

/** Top of an arzi opened from a shared link: who we are, in one glance, before anything else. */
export function WhatIsCard() {
  const { t } = useT();
  // "{yes}" / "{no}" in the sentence become the same words, in the same colours, as the vote buttons below.
  const parts = t('what.sub').split(/(\{yes\}|\{no\})/);
  return (
    <View style={s.card} testID="what-is">
      <Logo size={20} devTag={false} />
      <Text style={s.title}>{t('what.title')}</Text>
      <Text style={s.sub}>
        {parts.map((p, i) =>
          p === '{yes}' ? (
            <Text key={i} style={{ color: M.yes, fontWeight: '700' }}>{t('card.yes')}</Text>
          ) : p === '{no}' ? (
            <Text key={i} style={{ color: M.no, fontWeight: '700' }}>{t('card.no')}</Text>
          ) : (
            p
          ),
        )}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: M.primaryContainer, borderRadius: R.lg, padding: 16, gap: 6, marginBottom: 12 },
  title: { ...T.titleMedium, color: M.onPrimaryContainer, marginTop: 4 },
  sub: { ...T.bodySmall, color: M.onPrimaryContainer },
});
