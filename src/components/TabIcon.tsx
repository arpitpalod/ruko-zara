import { View, type ColorValue } from 'react-native';

/**
 * The three tab icons, drawn from plain shapes: an icon font would add a 380 KB download to the
 * first visit for three icons. Filled when the tab is selected, outlined otherwise.
 */
export type TabIconName = 'home' | 'new' | 'mine';

export function TabIcon({ name, focused, color }: { name: TabIconName; focused: boolean; color: ColorValue }) {
  const c = color as string;
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      {name === 'home' ? <Home c={c} on={focused} /> : name === 'new' ? <Plus c={c} on={focused} /> : <Person c={c} on={focused} />}
    </View>
  );
}

function Home({ c, on }: { c: string; on: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {/* roof */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 11,
          borderRightWidth: 11,
          borderBottomWidth: 9,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: c,
        }}
      />
      {!on ? (
        <View style={{ position: 'absolute', top: 4, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 5.5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fff' }} />
      ) : null}
      {/* walls with a door */}
      <View style={{ width: 15, height: 10, borderWidth: 2, borderTopWidth: 0, borderColor: c, backgroundColor: on ? c : 'transparent', alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{ width: 4, height: 5, backgroundColor: on ? '#fff' : c, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
      </View>
    </View>
  );
}

function Plus({ c, on }: { c: string; on: boolean }) {
  const mark = on ? '#fff' : c;
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c, backgroundColor: on ? c : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 10, height: 2, borderRadius: 1, backgroundColor: mark }} />
      <View style={{ position: 'absolute', width: 2, height: 10, borderRadius: 1, backgroundColor: mark }} />
    </View>
  );
}

function Person({ c, on }: { c: string; on: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: c, backgroundColor: on ? c : 'transparent' }} />
      <View style={{ width: 18, height: 9, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 2, borderBottomWidth: 2, borderColor: c, backgroundColor: on ? c : 'transparent' }} />
    </View>
  );
}
