import { router } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { inr } from '../lib/format';
import { useT } from '../lib/i18n';
import { useSavings } from '../lib/savings';
import { M, T } from '../lib/theme';
import { CirclePlus } from './Icon';
import { Button } from './ui';

const TALL = 100;
const SHORT = 52;

/**
 * The one constant thing on top (Feed and New request): how much you've saved by asking first.
 * Large at the top of the page, a slim bar once you scroll. Tap: My requests.
 * `postButton` (Feed): a "Post a request" button that stays in view, tall or slim.
 */
export function SavingsHeader({ scrollY, postButton }: { scrollY: Animated.Value; postButton?: boolean }) {
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
        {postButton ? (
          <View style={s.postWrap} pointerEvents="box-none">
            <Button
              label={t('save.postTop')}
              icon={CirclePlus}
              onPress={() => router.push('/new')}
              hitSlop={8}
              testID="post-button"
            />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** Feeds a list's scroll position to the header. */
export const trackScroll = (scrollY: Animated.Value) =>
  Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

// Material's "primary container": the warm orange tint marks the one number that matters.
const s = StyleSheet.create({
  bar: { backgroundColor: M.primaryContainer, overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 20 },
  tall: { justifyContent: 'center' },
  short: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...T.labelLarge, color: M.onPrimaryContainer, opacity: 0.85 },
  amt: { ...T.display, color: M.onPrimaryContainer },
  amtSmall: { ...T.titleMedium, fontWeight: '800', color: M.onPrimaryContainer },
  tag: { ...T.bodySmall, color: M.onPrimaryContainer, opacity: 0.8 },
  postWrap: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
});
