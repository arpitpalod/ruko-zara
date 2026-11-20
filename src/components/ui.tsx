import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityRole,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { E, M, R, T } from '../lib/theme';
import { Check, type LucideIcon } from './Icon';

/**
 * The app's Material 3 building blocks: buttons, chips, cards, a segmented button and a text
 * field. Every screen uses these, so shapes, sizes and pressed states are the same everywhere.
 */

/** Pressed state: the content colour laid over the button at 12%, as Material does. */
function StateLayer({ color, on }: { color: string; on: boolean }) {
  if (!on) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.12 }]} />;
}

type Variant = 'filled' | 'tonal' | 'outlined' | 'text';
const SIZES = { sm: { h: 36, px: 14 }, md: { h: 40, px: 20 }, lg: { h: 52, px: 24 } };
const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  filled: { bg: M.primary, fg: M.onPrimary },
  tonal: { bg: M.secondaryContainer, fg: M.onSecondaryContainer },
  outlined: { bg: 'transparent', fg: M.primary, border: M.outline },
  text: { bg: 'transparent', fg: M.primary },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  /** Own colours (e.g. WhatsApp green, Buy it / Skip it). */
  colors?: { bg: string; fg: string; border?: string };
  disabled?: boolean;
  /** Stretch to the row's width. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; expanded?: boolean; disabled?: boolean };
  hitSlop?: number;
}

export function Button({
  label,
  onPress,
  variant = 'filled',
  size = 'md',
  icon: I,
  colors,
  disabled,
  block,
  style,
  textStyle,
  testID,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  hitSlop,
}: ButtonProps) {
  const c = colors ?? VARIANTS[variant];
  const z = SIZES[size];
  const flat = variant === 'text';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      android_ripple={{ color: c.fg + '33', borderless: false }}
      style={[
        s.btn,
        { minHeight: z.h, paddingHorizontal: flat ? 12 : z.px, backgroundColor: c.bg },
        c.border ? { borderWidth: 1, borderColor: c.border } : null,
        block ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        disabled && { opacity: 0.38 },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          <StateLayer color={c.fg} on={pressed && Platform.OS !== 'android'} />
          {I ? <I size={size === 'lg' ? 20 : 18} color={c.fg} strokeWidth={2.25} /> : null}
          <Text style={[size === 'lg' ? s.btnTL : T.labelLarge, { color: c.fg, textAlign: 'center', flexShrink: 1 }, textStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Material filter chip. Selected: tinted, with a check mark. `colors` makes a coloured choice chip. */
export function Chip({
  label,
  selected,
  onPress,
  colors,
  testID,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  colors?: { fg: string; border: string; pressedBg: string; pressedFg: string };
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        s.chip,
        selected ? s.chipOn : { borderColor: colors?.border ?? M.outlineVariant },
        colors && pressed ? { backgroundColor: colors.pressedBg, borderColor: colors.pressedBg } : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {!colors ? <StateLayer color={M.onSurface} on={pressed} /> : null}
          {selected ? <Check size={16} color={M.onSecondaryContainer} strokeWidth={2.5} /> : null}
          <Text style={[T.labelLarge, { color: colors ? (pressed ? colors.pressedFg : colors.fg) : selected ? M.onSecondaryContainer : M.onSurfaceVariant }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Material card. `elevated` for the feed, `filled` for things inside a page, `outlined` for quiet boxes. */
export function Card({
  children,
  onPress,
  variant = 'elevated',
  style,
  testID,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'filled' | 'outlined';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const look = [s.card, variant === 'elevated' ? s.cardElevated : variant === 'filled' ? s.cardFilled : s.cardOutlined, style];
  // A plain box when not tappable: a disabled wrapper would mark the buttons inside as disabled for screen readers.
  if (!onPress) return <View style={look} testID={testID}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={look} testID={testID}>
      {({ pressed }) => (
        <>
          <StateLayer color={M.onSurface} on={pressed} />
          {children}
        </>
      )}
    </Pressable>
  );
}

/** Material segmented button: one choice out of a few. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.seg, style]} accessibilityRole="tablist">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.segBtn, i > 0 && s.segDivider, on && { backgroundColor: M.secondaryContainer }]}
          >
            {({ pressed }) => (
              <>
                <StateLayer color={M.onSurface} on={pressed} />
                {on ? <Check size={16} color={M.onSecondaryContainer} strokeWidth={2.5} /> : null}
                <Text style={[T.labelLarge, { color: on ? M.onSecondaryContainer : M.onSurface }]} numberOfLines={1}>
                  {o.label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Material outlined text field: the border thickens and turns orange while typing. */
export function Field({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={M.onSurfaceVariant}
      {...props}
      onFocus={(e) => {
        setFocus(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        onBlur?.(e);
      }}
      style={[s.field, focus && s.fieldFocus, style]}
    />
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: R.full,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  btnTL: { fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: 0.1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: R.sm,
    borderWidth: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  chipOn: { backgroundColor: M.secondaryContainer, borderColor: M.secondaryContainer, paddingLeft: 10 },
  card: { borderRadius: R.lg, padding: 16, overflow: 'hidden' },
  cardElevated: { backgroundColor: M.surfaceContainerLowest, ...E[1] },
  cardFilled: { backgroundColor: M.surfaceContainerHigh },
  cardOutlined: { backgroundColor: M.surfaceContainerLowest, borderWidth: 1, borderColor: M.outlineVariant },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: M.outline, borderRadius: R.full, overflow: 'hidden', minHeight: 40 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, overflow: 'hidden' },
  segDivider: { borderLeftWidth: 1, borderLeftColor: M.outline },
  field: {
    ...T.bodyLarge,
    color: M.onSurface,
    backgroundColor: M.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: M.outline,
    borderRadius: R.sm,
    paddingHorizontal: 15,
    paddingVertical: 15,
    minHeight: 56,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null), // the browser's own focus ring
  },
  // A second pixel of border drawn inside, so the text doesn't move when the field gets focus.
  fieldFocus: { borderColor: M.primary, boxShadow: `inset 0px 0px 0px 1px ${M.primary}` },
});
