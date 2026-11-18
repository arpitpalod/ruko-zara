import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { inr } from '../lib/format';
import { useT } from '../lib/i18n';
import { C } from '../lib/theme';
import { CirclePlus, IconText } from './Icon';

/**
 * "Saved so far: ₹0 · Post a request". Shown in the feed once you've voted: you've helped others
 * decide, now ask about your own next buy. Savings grow only when you mark an arzi "Didn't buy".
 */
export function SavingsNudge({ saved }: { saved: number }) {
  const { t } = useT();
  return (
    <View style={s.box} testID="savings-nudge">
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{t('mine.saved')}</Text>
        <Text style={s.amt}>{inr(saved)}</Text>
        <Text style={s.ask}>{t('save.ask')}</Text>
      </View>
      <Pressable onPress={() => router.push('/new')} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <IconText icon={CirclePlus} size={16} color="#fff" style={s.btnT}>{t('save.post')}</IconText>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.ink, borderRadius: 16, padding: 14 },
  label: { color: '#D6D3D1', fontSize: 12.5, fontWeight: '600' },
  amt: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 1 },
  ask: { color: '#A8A29E', fontSize: 12.5, marginTop: 2 },
  btn: { backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
