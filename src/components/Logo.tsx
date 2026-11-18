import { useFonts } from 'expo-font';
import { createContext, useContext } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { C } from '../lib/theme';

/**
 * The logo: a shopping bag with a pause sign ("wait before you buy"), and the name in Baloo 2
 * (SIL Open Font License), cut down to the letters of "ruko zara" (2.4 KB). Until the font has
 * loaded, the name shows in the system font, so nothing waits for it.
 */
const WORDMARK = 'Baloo2Wordmark';
export const isDevSite = process.env.EXPO_PUBLIC_APP_ENV === 'dev';

export function useLoadLogoFont(): boolean {
  const [loaded] = useFonts({ [WORDMARK]: require('../../assets/fonts/Baloo2-Wordmark.ttf') });
  return loaded;
}
export const LogoFontReady = createContext(false);

/** The bag, white on an orange tile (as on the app icon). */
export function BagMark({ size = 30 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.23, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size * 0.8} height={size * 0.8} viewBox="5 7 90 90">
        <Path d="M42 36 V26 Q42 12 55 12 Q68 12 68 26 V36" fill="none" stroke="#F7B48E" strokeWidth={7} strokeLinecap="round" />
        <Path d="M20 34 H80 Q83 34 83.4 37 L88 88 Q88.4 94 82 94 H18 Q11.6 94 12 88 L16.6 37 Q17 34 20 34 Z" fill="#FFFFFF" />
        <Path d="M17.3 34 H82.7 L83.6 44 H16.4 Z" fill="#FFE3D2" />
        <Path d="M32 40 V28 Q32 15 45 15 Q58 15 58 28 V40" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
        <Rect x={35} y={54} width={12} height={29} rx={3.5} fill={C.brand} />
        <Rect x={53} y={54} width={12} height={29} rx={3.5} fill={C.brand} />
      </Svg>
    </View>
  );
}

/** Bag + name. The dev site adds a DEV tag so it's never mistaken for the live app. */
export function Logo({ size = 22 }: { size?: number }) {
  const font = useContext(LogoFontReady);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }} accessible accessibilityRole="header" accessibilityLabel="Ruko Zara">
      <BagMark size={size * 1.35} />
      <Text
        style={{
          fontSize: size * 1.15,
          color: C.ink,
          fontFamily: font ? WORDMARK : undefined,
          fontWeight: font ? 'normal' : '800',
          letterSpacing: -0.3,
          includeFontPadding: false,
          marginTop: font ? size * 0.12 : 0, // Baloo sits a little high
        }}
      >
        ruko zara
      </Text>
      {isDevSite ? (
        <Text style={{ backgroundColor: C.ink, color: '#fff', fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>DEV</Text>
      ) : null}
    </View>
  );
}
