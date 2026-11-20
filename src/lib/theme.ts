import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Material 3 colour roles, made from the brand orange (#E8590C) with Google's colour tools, then
 * tuned so every text colour passes WCAG AA on its background. Buy it / Skip it get their own
 * green and red roles (Material has no "success" colour).
 */
export const M = {
  brand: '#E8590C', // the logo tile and the shared result card only: too light for white text
  primary: '#C74800',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FFDBCE',
  onPrimaryContainer: '#5C1F00',
  secondaryContainer: '#F3DED6',
  onSecondaryContainer: '#2A170F',
  surface: '#FFF8F6',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FFF1EC',
  surfaceContainer: '#FCEAE4',
  surfaceContainerHigh: '#F6E4DE',
  surfaceContainerHighest: '#F1DFD9',
  onSurface: '#231A16',
  onSurfaceVariant: '#53433E',
  outline: '#85736D',
  outlineVariant: '#D8C2BA',
  inverseSurface: '#382E2A',
  inverseOnSurface: '#FFEDE7',
  yes: '#2C6A3B',
  onYes: '#FFFFFF',
  yesContainer: '#CDEFD0',
  onYesContainer: '#0F5226',
  no: '#BA1A1A',
  onNo: '#FFFFFF',
  noContainer: '#FFDAD6',
  onNoContainer: '#93000A',
  whatsapp: '#156D33', // WhatsApp's green, darkened until white text on it is readable
  scrim: 'rgba(0,0,0,0.6)',
};

/** Material 3 type scale (system font: Roboto on Android, San Francisco on iPhone). */
export const T = {
  display: { fontSize: 34, lineHeight: 42, fontWeight: '700' },
  headline: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  titleLarge: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  titleMedium: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.3 },
} satisfies Record<string, TextStyle>;

/** Material 3 corner sizes. */
export const R = { xs: 4, sm: 8, md: 12, lg: 16, xl: 28, full: 999 };

/** Material 3 elevation, as soft warm shadows. */
export const E = {
  1: { boxShadow: '0px 1px 2px rgba(35,26,22,0.14), 0px 1px 3px 1px rgba(35,26,22,0.07)' },
  2: { boxShadow: '0px 1px 2px rgba(35,26,22,0.16), 0px 2px 6px 2px rgba(35,26,22,0.08)' },
  3: { boxShadow: '0px 4px 8px 3px rgba(35,26,22,0.10), 0px 1px 3px rgba(35,26,22,0.18)' },
} satisfies Record<number, ViewStyle>;
