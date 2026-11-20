import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { catLabel } from '../lib/format';
import { useT } from '../lib/i18n';
import { M, T } from '../lib/theme';
import { CATEGORIES } from '../lib/types';
import { Logo } from './Logo';
import { Button, Chip } from './ui';

/** First time on the feed: "What do you shop for?" in their language. Optional; it orders the feed, never filters it. */
export function InterestsIntro({ onDone }: { onDone: (picks: string[]) => void }) {
  const { t } = useT();
  const [picks, setPicks] = useState<string[]>([]);
  const toggle = (c: string) => setPicks((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  return (
    <ScrollView style={{ backgroundColor: M.surface }} contentContainerStyle={s.wrap}>
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Logo size={26} />
      </View>
      <Text style={s.title}>{t('intro.title')}</Text>
      <Text style={s.sub}>{t('intro.sub')}</Text>
      <View style={s.chips}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={catLabel(c, t)} selected={picks.includes(c)} onPress={() => toggle(c)} testID={`intro-${c}`} />
        ))}
      </View>
      <Button
        label={picks.length ? t('intro.go') : t('intro.skip')}
        variant={picks.length ? 'filled' : 'outlined'}
        size="lg"
        block
        onPress={() => onDone(picks)}
        testID="intro-go"
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { ...T.headline, color: M.onSurface, textAlign: 'center' },
  sub: { ...T.body, color: M.onSurfaceVariant, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: 10 },
});
