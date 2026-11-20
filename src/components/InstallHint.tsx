import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useT } from '../lib/i18n';
import { ANDROID_APK, openLink } from '../lib/legal';
import { M, T } from '../lib/theme';

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
  box: { paddingVertical: 2 },
  tip: { ...T.bodySmall, color: M.onSurfaceVariant },
  link: { ...T.labelLarge, color: M.primary },
});
