import type { ComponentType, ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Icons (Lucide, drawn as SVG) instead of emojis: emojis look different on every phone, icons
 * look the same everywhere and take the text's colour.
 */
// One file per icon: importing from the package root would pull in all 1,500+ icons (~250 KB).
export { default as Ban } from 'lucide-react-native/icons/ban';
export { default as CirclePlus } from 'lucide-react-native/icons/circle-plus';
export { default as House } from 'lucide-react-native/icons/house';
export { default as User } from 'lucide-react-native/icons/user';
export { default as BadgeCheck } from 'lucide-react-native/icons/badge-check';
export { default as CircleCheck } from 'lucide-react-native/icons/circle-check';
export { default as Eye } from 'lucide-react-native/icons/eye';
export { default as EyeOff } from 'lucide-react-native/icons/eye-off';
export { default as Globe } from 'lucide-react-native/icons/globe';
export { default as Link2 } from 'lucide-react-native/icons/link-2';
export { default as PartyPopper } from 'lucide-react-native/icons/party-popper';
export { default as ShieldCheck } from 'lucide-react-native/icons/shield-check';
export { default as ShoppingBag } from 'lucide-react-native/icons/shopping-bag';
export { default as Share2 } from 'lucide-react-native/icons/share-2';
export { default as X } from 'lucide-react-native/icons/x';
export { default as Vote } from 'lucide-react-native/icons/vote';

type LucideIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** An icon and text on one line; the icon takes the text's colour and size. */
export function IconText({
  icon: I,
  color,
  size = 15,
  style,
  box,
  children,
}: {
  icon: LucideIcon;
  color: string;
  size?: number;
  style?: StyleProp<TextStyle>;
  box?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, box]}>
      <I size={size} color={color} strokeWidth={2.25} />
      <Text style={[{ color, flexShrink: 1 }, style]}>{children}</Text>
    </View>
  );
}
