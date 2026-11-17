import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useT } from '../lib/i18n';
import { ANDROID_APK, openLink } from '../lib/legal';
import { C } from '../lib/theme';

/** Web only: Android visitors get the app download link; iPhone visitors get the Add-to-Home-Screen tip. */
export function InstallHint() {
  const { t } = useT();
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  const iOS = /iPhone|iPad|iPod/i.test(ua);
  const standalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
  if (standalone) return null; // already opened from the Home Screen

  if (iOS) return <Text style={[s.box, s.tip]}>{t('web.ios')}</Text>;
  return (
    <Pressable onPress={() => openLink(ANDROID_APK)} style={s.box} accessibilityRole="link">
      <Text style={s.link}>{t('web.android')}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  tip: { fontSize: 13, color: C.ink },
  link: { fontSize: 14, fontWeight: '800', color: C.brand },
});
