import type { ColorValue } from 'react-native';
import { CirclePlus, House, User } from './Icon';

/** The three tab icons, from the same icon set as the rest of the app. Bolder when selected. */
export type TabIconName = 'home' | 'new' | 'mine';

const ICONS = { home: House, new: CirclePlus, mine: User };

export function TabIcon({ name, focused, color }: { name: TabIconName; focused: boolean; color: ColorValue }) {
  const I = ICONS[name];
  return <I size={24} color={color as string} strokeWidth={focused ? 2.5 : 1.75} />;
}
