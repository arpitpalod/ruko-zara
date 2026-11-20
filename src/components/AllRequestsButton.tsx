import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { leftArrival } from '../lib/entry';
import { useT } from '../lib/i18n';
import { M, T } from '../lib/theme';
import { ArrowLeft } from './Icon';

/** On an arzi opened from a shared link, the back arrow says where it goes. */
export function AllRequestsButton() {
  const { t } = useT();
  return (
    <Pressable
      onPress={() => {
        leftArrival();
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      accessibilityRole="button"
      testID="all-requests"
      hitSlop={8}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
    >
      <ArrowLeft size={20} color={M.primary} />
      <Text style={{ ...T.labelLarge, color: M.primary }}>{t('req.allRequests')}</Text>
    </Pressable>
  );
}
