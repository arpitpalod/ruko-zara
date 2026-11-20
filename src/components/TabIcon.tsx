import type { ColorValue } from 'react-native';
import { View } from 'react-native';
import { M, R } from '../lib/theme';
import { CirclePlus, House, User } from './Icon';

/** The three tab icons. The selected one sits in Material's pill-shaped indicator. */
export type TabIconName = 'home' | 'new' | 'mine';

const ICONS = { home: House, new: CirclePlus, mine: User };

export function TabIcon({ name, focused, color }: { name: TabIconName; focused: boolean; color: ColorValue }) {
  const I = ICONS[name];
  return (
    <View
      style={{
        width: 60,
        height: 32,
        borderRadius: R.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? M.secondaryContainer : 'transparent',
      }}
    >
      <I size={22} color={focused ? M.onSecondaryContainer : (color as string)} strokeWidth={focused ? 2.4 : 1.9} />
    </View>
  );
}
