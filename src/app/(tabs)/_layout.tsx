import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageButton } from '../../components/LanguageButton';
import { Logo } from '../../components/Logo';
import { TabIcon, type TabIconName } from '../../components/TabIcon';
import { useT } from '../../lib/i18n';
import { M, T } from '../../lib/theme';

const icon = (name: TabIconName) =>
  function Icon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <TabIcon name={name} focused={focused} color={color} />;
  };

/** Material navigation bar: 3 destinations, the selected one in a pill. */
export default function TabsLayout() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: M.onSurface,
        tabBarInactiveTintColor: M.onSurfaceVariant,
        headerStyle: { backgroundColor: M.surface },
        headerTintColor: M.onSurface,
        headerShadowVisible: false,
        headerTitleStyle: T.titleLarge,
        tabBarStyle: { backgroundColor: M.surfaceContainer, borderTopWidth: 0, height: 72 + insets.bottom, paddingTop: 8 },
        tabBarLabelStyle: { ...T.labelMedium, marginTop: 4 },
        sceneStyle: { backgroundColor: M.surface },
        headerRight: () => <LanguageButton />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.feed'), headerTitle: () => <Logo />, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="new" options={{ title: t('tab.new'), headerTitle: t('tab.new'), tabBarIcon: icon('new') }} />
      <Tabs.Screen name="mine" options={{ title: t('tab.mine'), headerTitle: t('tab.mine'), tabBarIcon: icon('mine') }} />
    </Tabs>
  );
}
