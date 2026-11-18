import { router } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { inr } from '../lib/format';
import { useT } from '../lib/i18n';
import { useSavings } from '../lib/savings';
import { C } from '../lib/theme';

const TALL = 92;
const SHORT = 40;

/**
 * The one constant thing on top (Feed and New request): how much you've saved by asking first.
 * Large at the top of the page, a slim bar once you scroll. Tap: My requests.
 */
export function SavingsHeader({ scrollY }: { scrollY: Animated.Value }) {
  const { t } = useT();
  const saved = useSavings();
  const range = { inputRange: [0, TALL - SHORT], extrapolate: 'clamp' as const };
  const height = scrollY.interpolate({ ...range, outputRange: [TALL, SHORT] });
  const big = scrollY.interpolate({ ...range, outputRange: [1, 0] });
  const small = scrollY.interpolate({ ...range, outputRange: [0, 1] });

  return (
    <Pressable onPress={() => router.push('/mine')} accessibilityRole="button" accessibilityLabel={`${t('mine.saved')} ${inr(saved)}`}>
      <Animated.View style={[s.bar, { height }]} testID="savings-header">
        <Animated.View style={[s.layer, s.tall, { opacity: big }]} pointerEvents="none">
          <Text style={s.label}>{t('mine.saved')}</Text>
          <Text style={s.amt}>{inr(saved)}</Text>
          <Text style={s.tag}>{t('feed.tagline')}</Text>
        </Animated.View>
        <Animated.View style={[s.layer, s.short, { opacity: small }]} pointerEvents="none">
          <Text style={s.label}>{t('mine.saved')}</Text>
          <Text style={s.amtSmall}>{inr(saved)}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** Feeds a list's scroll position to the header. */
export const trackScroll = (scrollY: Animated.Value) =>
  Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

const s = StyleSheet.create({
  bar: { backgroundColor: C.ink, overflow: 'hidden' },
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 16 },
  tall: { justifyContent: 'center' },
  short: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: '#D6D3D1', fontSize: 12.5, fontWeight: '600' },
  amt: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '900' },
  amtSmall: { color: '#fff', fontSize: 16, fontWeight: '900' },
  tag: { color: '#A8A29E', fontSize: 12.5 },
});
