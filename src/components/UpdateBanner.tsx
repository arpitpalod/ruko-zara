import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useT } from '../lib/i18n';
import { ANDROID_APK, openLink } from '../lib/legal';
import { C } from '../lib/theme';
import { updateAvailable } from '../lib/version';

/** Android: "New version ready — tap to update" when a newer APK has been published. */
export function UpdateBanner() {
  const { t } = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    updateAvailable().then((yes) => alive && setShow(yes));
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;
  return (
    <Pressable onPress={() => openLink(ANDROID_APK)} style={s.box}>
      <Text style={s.t}>{t('update.available')}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: C.brand, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  t: { color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 20 },
});
